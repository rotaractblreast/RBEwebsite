/**
 * RBE Dashboard & Reviewer API — Google Apps Script
 *
 * Provides authenticated member application review, status updates,
 * reviewer note logging, and subscriber data access.
 *
 * All dashboard actions are strictly internal:
 * - NO emails are sent on status updates or notes.
 * - Credentials are kept in the "Reviewers" sheet.
 * - Sits alongside Code.gs in the same spreadsheet-bound project.
 */

/* global SpreadsheetApp, CacheService, PropertiesService, Utilities */

/**
 * Main dispatcher for dashboard actions from doPost.
 * Invoked by Code.gs when body.action is present.
 */
function handleDashboardAction_(body, e) {
  var action = String(body.action || "").trim();

  try {
    if (action === "login") {
      return handleDashboardLogin_(body, e);
    }

    // All actions below require a valid session token
    var session = getDashboardSession_(body.token);
    if (!session.ok) {
      return fail_(401, session.error || "Unauthorized. Please log in.");
    }

    if (action === "verifySession") {
      return json_({
        ok: true,
        status: 200,
        user: session.user,
      });
    }

    if (action === "getData") {
      return handleDashboardGetData_(Boolean(body.bypassCache));
    }

    if (action === "updateStatus") {
      return handleDashboardUpdateStatus_(body, session.user);
    }

    if (action === "addNote") {
      return handleDashboardAddNote_(body, session.user);
    }

    return fail_(400, "Unknown dashboard action: " + action);
  } catch (err) {
    return fail_(500, "Dashboard error: " + String(err && err.message ? err.message : err));
  }
}

/**
 * Verify reviewer email and password against the "Reviewers" sheet.
 */
function handleDashboardLogin_(body, e) {
  var email = String(body.email || "").toLowerCase().trim();
  var password = String(body.password || "").trim();

  if (!email || !password) {
    return fail_(400, "Email and password are required.");
  }

  // Rate limit login attempts: max 5 attempts per 5 minutes per IP/email
  var ip = (typeof clientIp_ === "function" && e) ? clientIp_(e) : "";
  var bucket = "dash_login:" + (email || ip || "anon");
  if (typeof rateLimit_ === "function") {
    var rate = rateLimit_(bucket, 5, 300);
    if (!rate.ok) {
      return fail_(429, "Too many login attempts. Please wait 5 minutes before trying again.");
    }
  }

  var ss = spreadsheet_();
  var sh = ensureReviewersSheet_(ss);
  var data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return fail_(403, "No reviewers configured in the Reviewers sheet.");
  }

  var reviewer = null;
  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][0] == null ? "" : data[i][0]).toLowerCase().trim();
    var rowPass = String(data[i][1] == null ? "" : data[i][1]).trim();
    var rowName = String(data[i][2] == null ? "" : data[i][2]).trim();
    var rowRole = String(data[i][3] == null ? "Reviewer" : data[i][3]).trim();
    var rowActive = String(data[i][4] == null ? "" : data[i][4]).toLowerCase().trim();

    var isActive = rowActive === "true" || rowActive === "1" || rowActive === "yes" || rowActive === "active";

    if (rowEmail === email && isActive) {
      if (rowPass === "changeMe123!" || rowPass === "REPLACE_WITH_YOUR_STRONG_PASSWORD") {
        return fail_(403, "Default placeholder password must be updated in the Google Sheet before login.");
      }

      // Check password: plain text match or SHA-256 match
      var passMatch = (rowPass === password) || (rowPass === sha256Hex_(password));
      if (passMatch) {
        reviewer = {
          email: rowEmail,
          name: rowName || rowEmail.split("@")[0],
          role: rowRole,
        };
        break;
      }
    }
  }

  if (!reviewer) {
    return fail_(401, "Invalid email, password, or inactive account.");
  }

  // Generate resilient HMAC session token valid for 12 hours
  var token = createSessionToken_(reviewer);

  return json_({
    ok: true,
    status: 200,
    token: token,
    user: reviewer,
  });
}

/**
 * Validate session token using CacheService with HMAC fallback.
 * Immune to transient cache evictions.
 */
function getDashboardSession_(token) {
  token = String(token || "").trim();
  if (!token) {
    return { ok: false, error: "Missing session token." };
  }

  // 1. Cryptographically verify HMAC signature and expiry first
  var verified = verifyHmacToken_(token);
  if (!verified.ok) {
    return { ok: false, error: verified.error || "Session expired or invalid. Please log in again." };
  }

  // 2. Try CacheService for validated reviewer profile
  var cache = CacheService.getScriptCache();
  var cached = cache ? cache.get("rbe_session_" + token) : null;
  if (cached) {
    try {
      var user = JSON.parse(cached);
      return { ok: true, user: user };
    } catch (e) {
      // fallback to sheet check
    }
  }

  // 3. Verify reviewer is still active in the Reviewers sheet
  var ss = spreadsheet_();
  var sh = ss.getSheetByName("Reviewers");
  if (!sh) {
    return { ok: false, error: "Reviewers sheet not found." };
  }

  var data = sh.getDataRange().getValues();
  var activeReviewer = null;
  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][0] == null ? "" : data[i][0]).toLowerCase().trim();
    var rowName = String(data[i][2] == null ? "" : data[i][2]).trim();
    var rowRole = String(data[i][3] == null ? "Reviewer" : data[i][3]).trim();
    var rowActive = String(data[i][4] == null ? "" : data[i][4]).toLowerCase().trim();
    var isActive = rowActive === "true" || rowActive === "1" || rowActive === "yes" || rowActive === "active";

    if (rowEmail === verified.email && isActive) {
      activeReviewer = {
        email: rowEmail,
        name: rowName || rowEmail.split("@")[0],
        role: rowRole,
      };
      break;
    }
  }

  if (!activeReviewer) {
    return { ok: false, error: "Account inactive or no longer authorized." };
  }

  // Cache profile for 15 minutes to respect sheet deactivations promptly
  if (cache) {
    cache.put("rbe_session_" + token, JSON.stringify(activeReviewer), 900);
  }

  return { ok: true, user: activeReviewer };
}

/**
 * One-click initialization for the Reviewers sheet and Join status/notes columns.
 * Run this function from the Apps Script editor toolbar (select "setupDashboard" -> click "Run").
 */
function setupDashboard() {
  var ss = spreadsheet_();
  var revSh = ensureReviewersSheet_(ss);
  var joinSh = ss.getSheetByName("Join");
  if (joinSh) {
    ensureJoinHeaders_(joinSh);
  }
  Logger.log("✓ Reviewers tab ready: " + revSh.getName());
  Logger.log("✓ Reviewers columns: Email, Password, Name, Role, Active");
  Logger.log("✓ Join audit columns: Col 20 (Status), Col 21 (Last Reviewer), Col 22 (Last Reviewed At), Col 23 (Notes)");
  return "Setup complete. Reviewers sheet and Join audit columns are ready.";
}

/**
 * Ensure the "Reviewers" sheet exists.
 * Headers: Email | Password | Name | Role | Active
 */
function ensureReviewersSheet_(ss) {
  var name = "Reviewers";
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(["Email", "Password", "Name", "Role", "Active"]);
    sh.appendRow(["admin@rotaractblreast.org", "changeMe123!", "Admin Reviewer", "Lead Reviewer", "TRUE"]);
  }
  return sh;
}

/**
 * Ensure the "Join" sheet has Col 20 (Status), Col 21 (Last Reviewer),
 * Col 22 (Last Reviewed At), and Col 23 (Notes) headers.
 * Safely migrates any legacy Col 21 notes to Col 23.
 */
function ensureJoinHeaders_(sh) {
  if (!sh) return;
  if (sh.getLastRow() === 0) {
    sh.appendRow(FORMS.join.headers);
  }
  var lastCol = Math.max(sh.getLastColumn(), 23);
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];

  // If column 21 header was previously "Notes" (old 2-column setup), migrate data to column 23
  if (String(headers[20] || "").trim().toLowerCase() === "notes" && (!headers[22] || String(headers[22]).trim() === "")) {
    var numRows = sh.getLastRow();
    if (numRows > 1) {
      var oldNotes = sh.getRange(2, 21, numRows - 1, 1).getValues();
      sh.getRange(2, 23, numRows - 1, 1).setValues(oldNotes);
      sh.getRange(2, 21, numRows - 1, 1).clearContent();
    }
  }

  sh.getRange(1, 20).setValue("Status");
  sh.getRange(1, 21).setValue("Last Reviewer");
  sh.getRange(1, 22).setValue("Last Reviewed At");
  sh.getRange(1, 23).setValue("Notes");
}

/**
 * Fetch all applications, newsletter subscribers, and contact inquiries.
 */
function handleDashboardGetData_(bypassCache) {
  var cache = CacheService.getScriptCache();
  if (!bypassCache && cache) {
    var cached = cache.get("rbe_dash_data_v2");
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        return json_(parsed);
      } catch (e) {
        // Fallback to fresh read if cache parsing fails
      }
    }
  }

  var ss = spreadsheet_();

  // 1. Applications from "Join"
  var joinSh = ss.getSheetByName("Join");
  var applications = [];
  if (joinSh && joinSh.getLastRow() > 1) {
    ensureJoinHeaders_(joinSh);
    var numRows = joinSh.getLastRow() - 1;
    var maxCols = Math.max(joinSh.getLastColumn(), 23);
    var joinValues = joinSh.getRange(2, 1, numRows, maxCols).getValues();

    for (var i = 0; i < joinValues.length; i++) {
      var r = joinValues[i];
      var rawStatus = String(r[19] || "").trim();
      var status = rawStatus || "Pending";
      var lastReviewer = String(r[20] || "").trim();
      var lastReviewedAt = formatTimestamp_(r[21]);
      var notes = String(r[22] || "").trim();

      // Backward-compat check: if r[20] was an old note entry:
      if (!notes && lastReviewer.indexOf("[") === 0 && (lastReviewer.indexOf("]:") !== -1 || lastReviewer.indexOf("] :") !== -1)) {
        notes = lastReviewer;
        lastReviewer = "";
      }

      // Deduce latest reviewer from notes chain if Col 21 has not been populated
      if (!lastReviewer && notes) {
        var noteEntries = notes.split(/\n\n+/).filter(Boolean);
        if (noteEntries.length > 0) {
          var lastEntry = noteEntries[noteEntries.length - 1];
          var m = lastEntry.match(/^\[([^\]|]+?)\s*(?:\||\s+-\s+)\s*([^\]]+?)\]:\s*[\s\S]*$/);
          if (m) {
            lastReviewedAt = lastReviewedAt || m[1].trim();
            lastReviewer = m[2].trim();
          }
        }
      }

      applications.push({
        rowIndex: i + 2, // 1-based sheet row index (row 1 is header)
        timestamp: formatTimestamp_(r[0]),
        name: String(r[1] || ""),
        email: String(r[2] || ""),
        phone: String(r[3] || ""),
        dob: String(r[4] || ""),
        gender: String(r[5] || ""),
        address: String(r[6] || ""),
        social: String(r[7] || ""),
        organizationType: String(r[8] || ""),
        organization: String(r[9] || ""),
        rotaractStatus: String(r[10] || ""),
        why: String(r[11] || ""),
        clubName: String(r[12] || ""),
        journey: String(r[13] || ""),
        hobbies: String(r[14] || ""),
        contribute: String(r[15] || ""),
        contributeOther: String(r[16] || ""),
        status: status,
        lastReviewer: lastReviewer,
        lastReviewedAt: lastReviewedAt,
        notes: notes,
      });
    }
  }

  // 2. Newsletter Subscribers
  var newsSh = ss.getSheetByName("Newsletter");
  var subscribers = [];
  if (newsSh && newsSh.getLastRow() > 1) {
    var newsRows = newsSh.getLastRow() - 1;
    var newsValues = newsSh.getRange(2, 1, newsRows, 2).getValues();
    for (var j = 0; j < newsValues.length; j++) {
      subscribers.push({
        rowIndex: j + 2,
        timestamp: formatTimestamp_(newsValues[j][0]),
        email: String(newsValues[j][1] || ""),
      });
    }
  }

  // 3. Contact Messages
  var contactSh = ss.getSheetByName("Contact");
  var contactMessages = [];
  if (contactSh && contactSh.getLastRow() > 1) {
    var cRows = contactSh.getLastRow() - 1;
    var cValues = contactSh.getRange(2, 1, cRows, 5).getValues();
    for (var k = 0; k < cValues.length; k++) {
      contactMessages.push({
        rowIndex: k + 2,
        timestamp: formatTimestamp_(cValues[k][0]),
        name: String(cValues[k][1] || ""),
        email: String(cValues[k][2] || ""),
        phone: String(cValues[k][3] || ""),
        message: String(cValues[k][4] || ""),
      });
    }
  }

  // Order descending so latest submissions appear on top
  applications.reverse();
  subscribers.reverse();
  contactMessages.reverse();

  var result = {
    ok: true,
    status: 200,
    applications: applications,
    subscribers: subscribers,
    contactMessages: contactMessages,
  };

  // Cache compiled payload for 120s (2 minutes) to ensure blazing fast reads
  if (cache) {
    try {
      cache.put("rbe_dash_data_v2", JSON.stringify(result), 120);
    } catch (e) {
      // Ignore if cache quota is exceeded
    }
  }

  return json_(result);
}

/**
 * Locate exact row in Join sheet. Uses rowIndex if email matches,
 * or falls back to searching column 3 (Email) and timestamp if rows shifted.
 */
function findJoinRowIndex_(joinSh, requestedRow, email, timestamp) {
  var lastRow = joinSh.getLastRow();
  if (lastRow < 2) return -1;

  var normEmail = String(email || "").toLowerCase().trim();

  // 1. Fast check: requested rowIndex
  if (requestedRow && requestedRow >= 2 && requestedRow <= lastRow) {
    var checkEmail = String(joinSh.getRange(requestedRow, 3).getValue() || "").toLowerCase().trim();
    if (!normEmail || checkEmail === normEmail) {
      return requestedRow;
    }
  }

  // 2. Fallback check: search by email & timestamp
  if (normEmail) {
    var data = joinSh.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowEmail = String(data[i][2] || "").toLowerCase().trim();
      var rowTs = formatTimestamp_(data[i][0]);
      if (rowEmail === normEmail) {
        if (!timestamp || rowTs === timestamp) {
          return i + 2;
        }
      }
    }
    // If exact timestamp didn't match, return first matching email
    for (var j = 0; j < data.length; j++) {
      if (String(data[j][2] || "").toLowerCase().trim() === normEmail) {
        return j + 2;
      }
    }
  }

  return -1;
}

/**
 * Update candidate status in the Join sheet (Column 20).
 * Also records Last Reviewer (Col 21) and Last Reviewed At (Col 22).
 * Strictly updates the sheet — NEVER triggers any email.
 */
function handleDashboardUpdateStatus_(body, user) {
  var requestedRow = Number(body.rowIndex);
  var email = String(body.email || "").trim();
  var timestamp = String(body.timestamp || "").trim();
  var newStatus = String(body.status || "").trim();
  var reviewerName = String(body.reviewerName || (user && user.name) || "Reviewer").trim();
  if (user && user.role) {
    reviewerName += " (" + user.role + ")";
  }

  if (!newStatus) {
    return fail_(400, "Status cannot be empty.");
  }

  var ss = spreadsheet_();
  var joinSh = ss.getSheetByName("Join");
  if (!joinSh) return fail_(404, "Join sheet not found.");

  ensureJoinHeaders_(joinSh);

  var actualRow = findJoinRowIndex_(joinSh, requestedRow, email, timestamp);
  if (actualRow === -1) {
    return fail_(404, "Application record could not be found.");
  }

  var nowStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm");

  joinSh.getRange(actualRow, 20).setValue(newStatus);
  joinSh.getRange(actualRow, 21).setValue(reviewerName);
  joinSh.getRange(actualRow, 22).setValue(nowStr);

  var cache = CacheService.getScriptCache();
  if (cache) {
    try {
      cache.remove("rbe_dash_data_v2");
    } catch (e) {}
  }

  return json_({
    ok: true,
    status: 200,
    message: "Status updated successfully.",
    statusValue: newStatus,
    lastReviewer: reviewerName,
    lastReviewedAt: nowStr,
    rowIndex: actualRow,
    email: email,
  });
}

/**
 * Append a note with reviewer attribution to Column 23 (Notes).
 * Also updates Column 21 (Last Reviewer) and Column 22 (Last Reviewed At).
 * Strictly updates the sheet — NEVER triggers any email.
 */
function handleDashboardAddNote_(body, user) {
  var requestedRow = Number(body.rowIndex);
  var email = String(body.email || "").trim();
  var timestamp = String(body.timestamp || "").trim();
  var noteText = String(body.note || "").trim();
  var reviewerName = String(body.reviewerName || (user && user.name) || "Reviewer").trim();
  if (user && user.role) {
    reviewerName += " (" + user.role + ")";
  }

  if (!noteText) {
    return fail_(400, "Note text cannot be empty.");
  }

  var ss = spreadsheet_();
  var joinSh = ss.getSheetByName("Join");
  if (!joinSh) return fail_(404, "Join sheet not found.");

  ensureJoinHeaders_(joinSh);

  var actualRow = findJoinRowIndex_(joinSh, requestedRow, email, timestamp);
  if (actualRow === -1) {
    return fail_(404, "Application record could not be found.");
  }

  var existingNotes = String(joinSh.getRange(actualRow, 23).getValue() || "").trim();
  var timeStamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm");
  var newEntry = "[" + timeStamp + " | " + reviewerName + "]: " + noteText;

  var updatedNotes = existingNotes ? existingNotes + "\n\n" + newEntry : newEntry;

  joinSh.getRange(actualRow, 21).setValue(reviewerName);
  joinSh.getRange(actualRow, 22).setValue(timeStamp);
  joinSh.getRange(actualRow, 23).setValue(updatedNotes);

  var cache = CacheService.getScriptCache();
  if (cache) {
    try {
      cache.remove("rbe_dash_data_v2");
    } catch (e) {}
  }

  return json_({
    ok: true,
    status: 200,
    message: "Note added successfully.",
    notes: updatedNotes,
    lastReviewer: reviewerName,
    lastReviewedAt: timeStamp,
    rowIndex: actualRow,
    email: email,
  });
}

/**
 * Format timestamp values safely to ISO/readable string.
 */
function formatTimestamp_(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
  }
  return String(val);
}

/**
 * Create an HMAC signed session token (valid for 12 hours) + cache it.
 */
function createSessionToken_(reviewer) {
  var expiry = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
  var payload = reviewer.email + ":" + expiry;
  var secret = getDashboardSecret_();
  var sig = Utilities.computeHmacSha256Signature(payload, secret);
  var sigHex = bytesToHex_(sig);
  var token = Utilities.base64EncodeWebSafe(payload) + "." + sigHex;

  var cache = CacheService.getScriptCache();
  if (cache) {
    cache.put("rbe_session_" + token, JSON.stringify(reviewer), 21600); // 6h cache
  }

  return token;
}

/**
 * Verify HMAC signed session token.
 */
function verifyHmacToken_(token) {
  token = String(token || "").trim();
  if (!token || token.indexOf(".") === -1) {
    return { ok: false, error: "Malformed session token." };
  }

  var parts = token.split(".");
  var payloadBase64 = parts[0];
  var providedSig = parts[1];

  var payload = "";
  try {
    var decodedBytes = Utilities.base64DecodeWebSafe(payloadBase64);
    payload = Utilities.newBlob(decodedBytes).getDataAsString();
  } catch (e) {
    return { ok: false, error: "Invalid token encoding." };
  }

  var pParts = payload.split(":");
  if (pParts.length !== 2) {
    return { ok: false, error: "Invalid token payload." };
  }

  var email = pParts[0];
  var expiry = Number(pParts[1]);

  if (isNaN(expiry) || Date.now() > expiry) {
    return { ok: false, error: "Session expired. Please log in again." };
  }

  var secret = getDashboardSecret_();
  var expectedSig = bytesToHex_(Utilities.computeHmacSha256Signature(payload, secret));

  if (!constantTimeEquals_(expectedSig, providedSig)) {
    return { ok: false, error: "Invalid token signature." };
  }

  return { ok: true, email: email };
}

/**
 * Constant-time equality comparison to prevent timing attacks.
 */
function constantTimeEquals_(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get or initialize a random secret key stored in Script Properties.
 */
function getDashboardSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("RBE_DASHBOARD_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + "-" + Utilities.getUuid();
    props.setProperty("RBE_DASHBOARD_SECRET", secret);
  }
  return secret;
}

function bytesToHex_(bytes) {
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var byteHex = b.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    hex += byteHex;
  }
  return hex;
}

/**
 * Compute SHA-256 hex string for optional hashed password storage.
 */
function sha256Hex_(text) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytesToHex_(raw);
}
