/**
 * RBE Dashboard & Reviewer API - Google Apps Script
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
    if (action === "logInstall") {
      return handleLogInstall_(body, e);
    }

    if (action === "login") {
      return handleDashboardLogin_(body, e);
    }

    if (action === "logout") {
      return handleDashboardLogout_(body);
    }

    if (action === "verifySession") {
      // Direct sheet verification: check Active Sessions sheet to immediately detect admin deletions or revocations
      var session = getDashboardSession_(body.token, true);
      if (!session.ok) {
        return fail_(401, session.error || "Unauthorized. Please log in.");
      }
      return json_({
        ok: true,
        status: 200,
        user: session.user,
        token: String(body.token || ""),
        oneSignalAppId: (typeof getConfig_ === "function" ? (getConfig_().oneSignalAppId || "") : ""),
      });
    }

    // All actions below require a valid session token (checks Active Sessions sheet directly)
    var session = getDashboardSession_(body.token, true);
    if (!session.ok) {
      return fail_(401, session.error || "Unauthorized. Please log in.");
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
  var matchedPass = "";
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
        matchedPass = rowPass;
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

  var device = String(body.device || "").trim() || "Web Browser";
  var passHash = sha256Hex_(matchedPass).substring(0, 16);
  var sessionId = "sess_" + Utilities.getUuid().replace(/-/g, "").substring(0, 16);
  var nowStr = formatTimestamp_(new Date());

  // Clear any existing password revocation flag for this user
  var cache = CacheService.getScriptCache();
  if (cache) {
    cache.remove("rbe_passrevoked_" + reviewer.email);
  }

  // Record active session in the "Active Sessions" sheet
  try {
    var sessSh = ensureSessionsSheet_(ss);
    sessSh.appendRow([
      sessionId,
      reviewer.email,
      reviewer.name,
      device,
      nowStr,
      nowStr,
      "Active",
    ]);
  } catch (err) {
    console.warn("Could not record session in Active Sessions sheet:", err);
  }

  // Generate resilient HMAC session token containing sessionId + password fingerprint
  var token = createSessionToken_(reviewer, sessionId, passHash);
  var initialPayload = compileDashboardPayload_(ss, false);

  return json_({
    ok: true,
    status: 200,
    token: token,
    user: reviewer,
    applications: initialPayload.applications,
    subscribers: initialPayload.subscribers,
    contactMessages: initialPayload.contactMessages,
    oneSignalAppId: initialPayload.oneSignalAppId || (typeof getConfig_ === "function" ? (getConfig_().oneSignalAppId || "") : ""),
  });
}

/**
 * Handle reviewer logout: mark session as Logged Out in the sheet and revoke cache.
 */
function handleDashboardLogout_(body) {
  var token = String(body.token || "").trim();
  if (token) {
    var verified = verifyHmacToken_(token);
    if (verified.ok && verified.sessionId) {
      var cache = CacheService.getScriptCache();
      if (cache) {
        cache.remove("rbe_sess_" + verified.sessionId);
        cache.put("rbe_revoked_" + verified.sessionId, "1", 86400); // 24h revoked flag
      }
      try {
        var ss = spreadsheet_();
        var sh = ss.getSheetByName("Active Sessions");
        if (sh) {
          var data = sh.getDataRange().getValues();
          for (var i = 1; i < data.length; i++) {
            if (String(data[i][0]).trim() === verified.sessionId) {
              sh.getRange(i + 1, 7).setValue("Logged Out");
              sh.getRange(i + 1, 6).setValue(formatTimestamp_(new Date()));
              break;
            }
          }
        }
      } catch (e) {
        console.warn("Error marking session logged out in sheet:", e);
      }
    }
  }
  return json_({ ok: true, status: 200, message: "Logged out successfully." });
}

/**
 * Validate session token using CacheService with HMAC fallback and sheet revocation check.
 * Immune to transient cache evictions and immediately respects password changes or admin revocations.
 */
function getDashboardSession_(token, bypassCache) {
  token = String(token || "").trim();
  if (!token) {
    return { ok: false, error: "Missing session token." };
  }

  // 1. Cryptographically verify HMAC signature and expiry first
  var verified = verifyHmacToken_(token);
  if (!verified.ok) {
    return { ok: false, error: verified.error || "Session expired or invalid. Please log in again." };
  }

  var cache = CacheService.getScriptCache();
  var sessionId = verified.sessionId;
  var email = verified.email;

  // 2. Check for instant revocation in fast memory cache
  if (cache) {
    if (sessionId && cache.get("rbe_revoked_" + sessionId) === "1") {
      return { ok: false, error: "This device session has been revoked. Please log in again." };
    }
    if (cache.get("rbe_passrevoked_" + email) === "1") {
      return { ok: false, error: "Password was changed. Please log in again." };
    }
  }

  // 3. Try CacheService for validated reviewer profile (if bypassCache is not requested)
  if (!bypassCache && cache && sessionId) {
    var cached = cache.get("rbe_sess_" + sessionId);
    if (cached) {
      try {
        var user = JSON.parse(cached);
        return { ok: true, user: user, sessionId: sessionId, passHash: verified.passHash };
      } catch (e) {}
    }
  }

  // 4. Verify reviewer is still active and password has not changed in Reviewers sheet
  var ss = spreadsheet_();
  var sh = ss.getSheetByName("Reviewers");
  if (!sh) {
    return { ok: false, error: "Reviewers sheet not found." };
  }

  var data = sh.getDataRange().getValues();
  var activeReviewer = null;
  var sheetPassHash = "";

  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][0] == null ? "" : data[i][0]).toLowerCase().trim();
    var rowPass = String(data[i][1] == null ? "" : data[i][1]).trim();
    var rowName = String(data[i][2] == null ? "" : data[i][2]).trim();
    var rowRole = String(data[i][3] == null ? "Reviewer" : data[i][3]).trim();
    var rowActive = String(data[i][4] == null ? "" : data[i][4]).toLowerCase().trim();
    var isActive = rowActive === "true" || rowActive === "1" || rowActive === "yes" || rowActive === "active";

    if (rowEmail === email) {
      if (!isActive) {
        if (cache && sessionId) cache.put("rbe_revoked_" + sessionId, "1", 3600);
        return { ok: false, error: "Account inactive or disabled by administrator." };
      }
      sheetPassHash = sha256Hex_(rowPass).substring(0, 16);
      activeReviewer = {
        email: rowEmail,
        name: rowName || rowEmail.split("@")[0],
        role: rowRole,
      };
      break;
    }
  }

  if (!activeReviewer) {
    if (cache && sessionId) cache.put("rbe_revoked_" + sessionId, "1", 3600);
    return { ok: false, error: "Account no longer authorized." };
  }

  // Check password fingerprint: if password in sheet changed or token has no password hash, reject session!
  if (!verified.passHash || (sheetPassHash && verified.passHash !== sheetPassHash)) {
    if (cache) {
      cache.put("rbe_passrevoked_" + email, "1", 3600);
    }
    markAllUserSessionsRevoked_(ss, email, "Revoked (Password Changed)");
    return { ok: false, error: "Password was changed or session expired. Please log in again." };
  }

  // 5. Verify session is still active in Active Sessions sheet (if sessionId exists)
  if (sessionId) {
    var sessSheet = ensureSessionsSheet_(ss);
    var sessData = sessSheet.getDataRange().getValues();
    var sessionFound = false;
    var isSessionActive = false;
    var sessionRow = -1;

    for (var s = 1; s < sessData.length; s++) {
      var sId = String(sessData[s][0] == null ? "" : sessData[s][0]).trim();
      if (sId === sessionId) {
        sessionFound = true;
        sessionRow = s + 1;
        var sStatus = String(sessData[s][6] == null ? "" : sessData[s][6]).toLowerCase().trim();
        isSessionActive = (sStatus === "active");
        break;
      }
    }

    if (!sessionFound) {
      if (cache) {
        cache.remove("rbe_sess_" + sessionId);
        cache.put("rbe_revoked_" + sessionId, "1", 86400); // 24-hour block
      }
      return { ok: false, error: "This session has been revoked or removed from the server. Please log in again." };
    }

    if (!isSessionActive) {
      if (cache) {
        cache.remove("rbe_sess_" + sessionId);
        cache.put("rbe_revoked_" + sessionId, "1", 86400); // 24-hour block
      }
      return { ok: false, error: "This device session has been revoked by an administrator." };
    }

    // Throttled update of Last Active At (at most once every 15 mins)
    if (sessionFound && isSessionActive && sessionRow > 1) {
      touchSessionActivity_(sessSheet, sessionRow, sessionId);
    }
  }

  // Cache verified profile for 30 seconds (responsive to Sheet edits while protecting quota)
  if (cache && sessionId) {
    try {
      cache.put("rbe_sess_" + sessionId, JSON.stringify(activeReviewer), 30);
    } catch (e) {}
  }

  return { ok: true, user: activeReviewer, sessionId: sessionId, passHash: sheetPassHash };
}

/**
 * Throttled update of Last Active At in the Active Sessions sheet (at most once every 15 min).
 */
function touchSessionActivity_(sh, rowIndex, sessionId) {
  var cache = CacheService.getScriptCache();
  if (cache) {
    var lastTouched = cache.get("rbe_touched_" + sessionId);
    if (lastTouched) return;
    cache.put("rbe_touched_" + sessionId, "1", 900); // 15 min throttle
  }
  try {
    sh.getRange(rowIndex, 6).setValue(formatTimestamp_(new Date()));
  } catch (e) {}
}

/**
 * Invalidate all sessions for a specific user when password is changed.
 */
function markAllUserSessionsRevoked_(ss, email, reason) {
  try {
    var sh = ss.getSheetByName("Active Sessions");
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    email = String(email || "").toLowerCase().trim();
    var cache = CacheService.getScriptCache();
    var nowStr = formatTimestamp_(new Date());

    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][1] == null ? "" : data[i][1]).toLowerCase().trim();
      var rowStatus = String(data[i][6] == null ? "" : data[i][6]).toLowerCase().trim();
      if (rowEmail === email && rowStatus === "active") {
        sh.getRange(i + 1, 7).setValue(reason || "Revoked");
        sh.getRange(i + 1, 6).setValue(nowStr);
        var sId = String(data[i][0]).trim();
        if (sId && cache) {
          cache.remove("rbe_sess_" + sId);
          cache.put("rbe_revoked_" + sId, "1", 86400);
        }
      }
    }
  } catch (e) {
    console.warn("Could not mark user sessions revoked:", e);
  }
}

/**
 * One-click initialization for the Reviewers sheet and Join status/notes columns.
 * Run this function from the Apps Script editor toolbar (select "setupDashboard" -> click "Run").
 */
function setupDashboard() {
  var ss = spreadsheet_();
  var revSh = ensureReviewersSheet_(ss);
  var sessSh = ensureSessionsSheet_(ss);
  var joinSh = ss.getSheetByName("Join");
  if (joinSh) {
    ensureJoinHeaders_(joinSh);
  }
  Logger.log("✓ Reviewers tab ready: " + revSh.getName());
  Logger.log("✓ Active Sessions tab ready: " + sessSh.getName());
  Logger.log("✓ Join audit columns: Col 20 (Status), Col 21 (Last Reviewer), Col 22 (Last Reviewed At), Col 23 (Notes)");
  return "Setup complete. Reviewers, Active Sessions, and Join audit columns are ready.";
}

/**
 * Ensure the "Active Sessions" sheet exists.
 * Headers: Session ID | Reviewer Email | Reviewer Name | Device / Platform | Logged In At | Last Active At | Status
 */
function ensureSessionsSheet_(ss) {
  var name = "Active Sessions";
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow([
      "Session ID",
      "Reviewer Email",
      "Reviewer Name",
      "Device / Platform",
      "Logged In At",
      "Last Active At",
      "Status",
    ]);
    var header = sh.getRange(1, 1, 1, 7);
    header.setFontWeight("bold");
    header.setBackground("#fff3e0"); // Light brand tone
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, 7);
  }
  return sh;
}

/**
 * Ensure the "Installs" sheet exists to log PWA installations and platform telemetry.
 * Headers: Timestamp | Platform | Device / UserAgent | Source | Status
 */
function ensureInstallsSheet_(ss) {
  var name = "Installs";
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow([
      "Timestamp",
      "Platform",
      "Device / UserAgent",
      "Source",
      "Status",
    ]);
    var header = sh.getRange(1, 1, 1, 5);
    header.setFontWeight("bold");
    header.setBackground("#e8f5e9");
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, 5);
  }
  return sh;
}

/**
 * Log PWA install telemetry to the Installs sheet.
 */
function handleLogInstall_(body, e) {
  try {
    var ss = spreadsheet_();
    var sh = ensureInstallsSheet_(ss);
    var nowStr = formatTimestamp_(new Date());
    var platform = String(body.platform || body.os || "Web").trim();
    var device = String(body.device || body.userAgent || header_(e, "User-Agent") || "Unknown Device").trim();
    var source = String(body.source || "PWA Install Prompt").trim();
    
    sh.appendRow([
      nowStr,
      platform,
      device,
      source,
      "Installed",
    ]);
    return json_({ ok: true, status: 200, message: "Install telemetry recorded." });
  } catch (err) {
    console.warn("Error recording install telemetry:", err);
    return json_({ ok: true, status: 200, note: "Telemetry skipped" });
  }
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

  // Batch write headers only if missing
  var needStatus = String(headers[19] || "").trim() !== "Status";
  var needReviewer = String(headers[20] || "").trim() !== "Last Reviewer";
  var needReviewedAt = String(headers[21] || "").trim() !== "Last Reviewed At";
  var needNotes = String(headers[22] || "").trim() !== "Notes";

  if (needStatus || needReviewer || needReviewedAt || needNotes) {
    sh.getRange(1, 20, 1, 4).setValues([["Status", "Last Reviewer", "Last Reviewed At", "Notes"]]);
  }
}

/**
 * Compile all applications, newsletter subscribers, and contact inquiries.
 */
function compileDashboardPayload_(ss, bypassCache) {
  var cache = CacheService.getScriptCache();
  if (!bypassCache && cache) {
    var cached = cache.get("rbe_dash_data_v2");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback to fresh read if cache parsing fails
      }
    }
  }

  ss = ss || spreadsheet_();

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
        dob: formatDob_(r[4]),
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
    oneSignalAppId: (typeof getConfig_ === "function" ? (getConfig_().oneSignalAppId || "") : ""),
  };

  // Cache compiled payload for 120s (2 minutes) to ensure blazing fast reads
  if (cache) {
    try {
      cache.put("rbe_dash_data_v2", JSON.stringify(result), 120);
    } catch (e) {
      // Ignore if cache quota is exceeded
    }
  }

  return result;
}

/**
 * Fetch all applications, newsletter subscribers, and contact inquiries.
 */
function handleDashboardGetData_(bypassCache) {
  return json_(compileDashboardPayload_(null, bypassCache));
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
 * Strictly updates the sheet - NEVER triggers any email.
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

  // Fast single batch write: Col 20 (Status), Col 21 (Last Reviewer), Col 22 (Last Reviewed At)
  joinSh.getRange(actualRow, 20, 1, 3).setValues([[newStatus, reviewerName, nowStr]]);

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
 * Strictly updates the sheet - NEVER triggers any email.
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

  var actualRow = findJoinRowIndex_(joinSh, requestedRow, email, timestamp);
  if (actualRow === -1) {
    return fail_(404, "Application record could not be found.");
  }

  var existingNotes = String(joinSh.getRange(actualRow, 23).getValue() || "").trim();
  var timeStamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm");
  var newEntry = "[" + timeStamp + " | " + reviewerName + "]: " + noteText;

  var updatedNotes = existingNotes ? existingNotes + "\n\n" + newEntry : newEntry;

  // Fast single batch write: Col 21 (Last Reviewer), Col 22 (Last Reviewed At), Col 23 (Notes)
  joinSh.getRange(actualRow, 21, 1, 3).setValues([[reviewerName, timeStamp, updatedNotes]]);

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
 * Format Date of Birth safely to "MMMM d, yyyy" (e.g. "March 12, 1993").
 */
function formatDob_(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Kolkata", "MMMM d, yyyy");
  }
  return String(val);
}

/**
 * Create an HMAC signed session token (valid for 30 days) + cache it.
 * Format: base64(sessionId:email:expiry:passHash).hmacSignature
 */
function createSessionToken_(reviewer, sessionId, passHash) {
  var expiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days persistent session
  sessionId = sessionId || ("sess_" + Utilities.getUuid().replace(/-/g, "").substring(0, 16));
  passHash = passHash || "";
  var payload = sessionId + ":" + reviewer.email + ":" + expiry + ":" + passHash;
  var secret = getDashboardSecret_();
  var sig = Utilities.computeHmacSha256Signature(payload, secret);
  var sigHex = bytesToHex_(sig);
  var token = Utilities.base64EncodeWebSafe(payload) + "." + sigHex;

  var cache = CacheService.getScriptCache();
  if (cache) {
    cache.put("rbe_sess_" + sessionId, JSON.stringify(reviewer), 30); // 30-second short cache
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
  var sessionId = "";
  var email = "";
  var expiry = 0;
  var passHash = "";

  if (pParts.length === 4) {
    sessionId = pParts[0];
    email = pParts[1];
    expiry = Number(pParts[2]);
    passHash = pParts[3];
  } else if (pParts.length === 2) {
    // Reject legacy 2-part token (email:expiry): require re-login once to register session in Active Sessions sheet
    return { ok: false, error: "Session updated for enhanced security. Please log in again to register your session." };
  } else {
    return { ok: false, error: "Invalid token payload." };
  }

  if (isNaN(expiry) || Date.now() > expiry) {
    return { ok: false, error: "Session expired. Please log in again." };
  }

  var secret = getDashboardSecret_();
  var expectedSig = bytesToHex_(Utilities.computeHmacSha256Signature(payload, secret));

  if (!constantTimeEquals_(expectedSig, providedSig)) {
    return { ok: false, error: "Invalid token signature." };
  }

  return { ok: true, sessionId: sessionId, email: email, passHash: passHash, expiry: expiry };
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
