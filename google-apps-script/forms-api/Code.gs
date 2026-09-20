/**
 * RBE Forms API — Google Apps Script Web App
 *
 * Single script + one Spreadsheet with three sheets:
 *   Join | Newsletter | Contact
 *
 * POST JSON (as text/plain from the browser to skip CORS preflight):
 *   { "form": "join" | "newsletter" | "contact", ...fields }
 *
 * Response contract (always JSON — Apps Script cannot reliably set HTTP status):
 *   Success → { "ok": true,  "status": 200, "form": "join" }
 *   Failure → { "ok": false, "status": 400|403|429|500, "error": "...", "form"?: "join" }
 *
 * The website must gate thank-you UI on `ok === true`, not on the HTTP code.
 * No shared secret — this is a public append-only endpoint (same model as Google Forms).
 *
 * Emails: only `join` sends mail (club + applicant).
 * Contact & newsletter: store only.
 *
 * Setup: open the Google Sheet → Extensions → Apps Script → paste this file
 * (container-bound). Edit CONFIG below if needed. Deploy as Web App (Anyone).
 * See README.md.
 */

/* global SpreadsheetApp, MailApp, CacheService, ContentService, Logger */

/**
 * Edit these in place — no Script Properties UI.
 * There are no secrets here; the Web App URL is already public write-only.
 *
 * MailApp always sends From the Google account that owns this script.
 * Applicant replies must not depend on that — they follow replyToEmail below.
 */
var CONFIG = {
  // Inbox that receives the full application (and is CC'd on the thank-you).
  clubNotifyEmail: "rotaractblreast@gmail.com",
  // Where applicants land when they hit Reply on the thank-you.
  // Comma-separated is fine if notifying multiple addresses.
  // Kept separate from clubNotifyEmail so you can notify one mailbox
  // but still accept replies on the public club address.
  replyToEmail: "rotaractblreast@gmail.com",
  mailFromName: "Rotaract Bangalore East",
  // Standalone portal URL for push notifications and reviewer links
  portalUrl: "https://connect.rotaractblreast.org",
  // Soft browser Origin/Referer allow-list. Empty string = skip the check.
  // Include every host that serves the join form or portal.
  allowedOrigins: "https://rotaractblreast.org,https://connect.rotaractblreast.org,http://localhost:4321,http://localhost:5173",
  // OneSignal Web Push credentials (optional — keep in the "Config" sheet tab for secrecy)
  oneSignalAppId: "",
  oneSignalApiKey: "",
};

/**
 * Read configuration with priority:
 * 1) "Config" sheet tab in the Google Sheet (allows instant edits without redeploying Web App)
 * 2) Fallback to hardcoded CONFIG constant (base defaults)
 *
 * Caches in ScriptCache for 60 seconds to balance instant updates with Google Sheets quota.
 */
function getConfig_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("rbe_sheet_config");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  var cfg = {};
  for (var k in CONFIG) {
    cfg[k] = CONFIG[k];
  }

  try {
    var ss = spreadsheet_();
    var sh = ensureConfigSheet_(ss);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var key = String(rows[i][0] == null ? "" : rows[i][0]).trim();
      var val = String(rows[i][1] == null ? "" : rows[i][1]).trim();
      if (key) {
        cfg[key] = val;
      }
    }
    cache.put("rbe_sheet_config", JSON.stringify(cfg), 60);
  } catch (err) {
    Logger.log("Using fallback CONFIG due to sheet read error: " + err);
  }

  return cfg;
}

/**
 * Ensure the "Config" sheet tab exists with default keys and descriptions.
 * Headers: Key | Value | Description
 */
function ensureConfigSheet_(ss) {
  var name = "Config";
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(["Key", "Value", "Description"]);
    sh.appendRow([
      "clubNotifyEmail",
      CONFIG.clubNotifyEmail || "rotaractblreast@gmail.com",
      "Email(s) receiving the full application alert (comma-separated OK)"
    ]);
    sh.appendRow([
      "replyToEmail",
      CONFIG.replyToEmail || "rotaractblreast@gmail.com",
      "Reply-To address on applicant thank-you emails"
    ]);
    sh.appendRow([
      "oneSignalAppId",
      CONFIG.oneSignalAppId || "",
      "OneSignal App ID (from onesignal.com Settings -> Keys & IDs)"
    ]);
    sh.appendRow([
      "oneSignalApiKey",
      CONFIG.oneSignalApiKey || "",
      "OneSignal REST API Key (Settings -> Keys & IDs) - kept secret in this sheet"
    ]);
    sh.appendRow([
      "mailFromName",
      CONFIG.mailFromName || "Rotaract Bangalore East",
      "From display name on outbound emails"
    ]);
    sh.appendRow([
      "portalUrl",
      CONFIG.portalUrl || "https://connect.rotaractblreast.org",
      "Standalone Reviewer Portal URL for notifications and reviewer CTAs"
    ]);
    sh.appendRow([
      "allowedOrigins",
      CONFIG.allowedOrigins || "https://rotaractblreast.org,https://connect.rotaractblreast.org,http://localhost:4321,http://localhost:5173",
      "Allowed browser origins for form submissions"
    ]);

    try {
      sh.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f0e4da");
      sh.setColumnWidth(1, 180);
      sh.setColumnWidth(2, 340);
      sh.setColumnWidth(3, 420);
    } catch (e) {}
  }
  return sh;
}

var FORMS = {
  join: {
    sheet: "Join",
    headers: [
      "Timestamp",
      "Name",
      "Email",
      "Phone",
      "Date of birth",
      "Gender",
      "Area / locality",
      "Social",
      "Student or professional",
      "College / company",
      "Rotaract status",
      "Why join",
      "Club name",
      "Rotaract journey",
      "Hobbies",
      "Where they can help",
      "Where they can help (other)",
      "User-Agent",
      "IP",
    ],
    // Gender and social are deliberately optional. Branch fields are checked in validateJoin_.
    required: [
      "name",
      "email",
      "phone",
      "dob",
      "address",
      "organizationType",
      "organization",
      "rotaractStatus",
      "hobbies",
      "contribute",
    ],
    validate: validateJoin_,
  },
  newsletter: {
    sheet: "Newsletter",
    headers: ["Timestamp", "Email", "User-Agent", "IP"],
    required: ["email"],
  },
  contact: {
    sheet: "Contact",
    headers: ["Timestamp", "Name", "Email", "Phone", "Message", "User-Agent", "IP"],
    required: ["name", "email", "phone", "message"],
  },
};

function doPost(e) {
  var form = "";
  try {
    var body = parseBody_(e);

    // Dashboard API dispatch (delegated to Dashboard.gs; zero impact on form submissions)
    if (body.action) {
      return handleDashboardAction_(body, e);
    }

    form = String(body.form || "")
      .toLowerCase()
      .trim();
    if (!FORMS[form]) {
      return fail_(400, "Unknown form. Use join, newsletter, or contact.");
    }

    var anti = checkAntiSpam_(e, body);
    if (anti.drop) {
      // Honeypot hit — pretend success, write nothing (do not tip bots off).
      return ok_(form);
    }
    if (!anti.ok) {
      return fail_(anti.status || 403, anti.error || "Forbidden.", form);
    }

    var missing = FORMS[form].required.filter(function (k) {
      return !list_(body[k]);
    });
    if (missing.length) {
      return fail_(400, "Missing fields: " + missing.join(", "), form);
    }

    if (FORMS[form].validate) {
      var problem = FORMS[form].validate(body);
      if (problem) return fail_(400, problem, form);
    }

    if (body.email && !isEmail_(body.email)) {
      return fail_(400, "Invalid email.", form);
    }

    if (form === "join" && body.phone && !isInPhone_(body.phone)) {
      return fail_(400, "Invalid phone. Use a 10-digit Indian mobile.", form);
    }

    var row = buildRow_(form, body, e);
    appendRow_(form, row);

    if (form === "join") {
      sendJoinEmails_(body);
      sendJoinPushNotification_(body);
    }

    return ok_(form);
  } catch (err) {
    return fail_(500, String(err && err.message ? err.message : err), form || undefined);
  }
}

/** Health check — GET the Web App URL. */
function doGet() {
  return json_({
    ok: true,
    status: 200,
    service: "rbe-forms-api",
    forms: Object.keys(FORMS),
    note: "POST JSON with { form, ...fields }. Gate UI on body.ok === true (HTTP status is unreliable).",
  });
}

// ——— response helpers ———

function ok_(form) {
  return json_({ ok: true, status: 200, form: form });
}

function fail_(status, error, form) {
  var body = { ok: false, status: status, error: String(error || "Something went wrong.") };
  if (form) body.form = form;
  return json_(body);
}

/**
 * Apps Script ContentService cannot set real HTTP status codes for Web App clients.
 * The `status` field in the JSON body is the authoritative signal — clients must use it
 * (along with `ok`) and ignore the transport status.
 */
function json_(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ——— join branch validation ———

/**
 * The website form only sends the fields for the branch the applicant picked, so the
 * flat `required` list can't cover these. Returns an error string, or "" when valid.
 */
function validateJoin_(body) {
  var occupation = str_(body.organizationType).toLowerCase();
  if (occupation !== "student" && occupation !== "professional") {
    return "organizationType must be student or professional.";
  }

  var status = str_(body.rotaractStatus).toLowerCase();
  if (status === "new") {
    if (!str_(body.why)) return "Missing fields: why";
  } else if (status === "experienced") {
    var gaps = [];
    if (!str_(body.clubName)) gaps.push("clubName");
    if (!str_(body.journey)) gaps.push("journey");
    if (gaps.length) return "Missing fields: " + gaps.join(", ");
  } else {
    return "rotaractStatus must be new or experienced.";
  }

  if (list_(body.contribute).indexOf("Other") !== -1 && !str_(body.contributeOther)) {
    return "Missing fields: contributeOther";
  }

  return "";
}

// ——— anti-spam ———

function checkAntiSpam_(e, body) {
  // 1) Honeypot — real users leave blank; bots fill it
  if (String(body.website || body.hp || "").trim()) {
    return { ok: false, drop: true };
  }

  // 2) Timing — client sends page-open epoch ms as `t`; reject instant submits (< 2s) and stale (> 2h)
  var t = Number(body.t);
  if (t) {
    var ageMs = Date.now() - t;
    if (ageMs < 2000) {
      return { ok: false, status: 429, error: "Too fast. Try again." };
    }
    if (ageMs > 2 * 60 * 60 * 1000) {
      return { ok: false, status: 400, error: "Form expired. Reload and try again." };
    }
  }

  // 3) Simple rate limit by email (or IP) — 5 submissions / 10 minutes
  var ip = clientIp_(e);
  var bucket = String(body.email || ip || "anon").toLowerCase();
  var rate = rateLimit_(bucket, 5, 600);
  if (!rate.ok) {
    return { ok: false, status: 429, error: "Too many submissions. Try later." };
  }

  // 4) Soft origin check (browsers only; curl can forge — defense in depth)
  var origin = header_(e, "Origin") || header_(e, "Referer") || "";
  var cfg = getConfig_();
  var allow = cfg.allowedOrigins || "";
  if (origin && allow) {
    var okOrigin = allow.split(",").some(function (o) {
      o = o.trim();
      return o && origin.indexOf(o) === 0;
    });
    if (!okOrigin) {
      return { ok: false, status: 403, error: "Origin not allowed." };
    }
  }

  return { ok: true };
}

function rateLimit_(key, max, windowSeconds) {
  var cache = CacheService.getScriptCache();
  var k = "rl:" + key;
  var raw = cache.get(k);
  var n = raw ? Number(raw) : 0;
  if (n >= max) return { ok: false };
  cache.put(k, String(n + 1), windowSeconds);
  return { ok: true };
}

// ——— sheets ———

/**
 * This project is meant to be a *container-bound* script: open the spreadsheet,
 * Extensions → Apps Script, paste Code.gs there. The script then owns that file
 * via getActiveSpreadsheet() — no SPREADSHEET_ID property needed.
 */
function spreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "No active spreadsheet. Open the Google Sheet → Extensions → Apps Script, " +
        "paste this Code.gs there, then deploy the Web App from that project."
    );
  }
  return ss;
}

function sheetFor_(form) {
  var ss = spreadsheet_();
  var name = FORMS[form].sheet;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(FORMS[form].headers);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(FORMS[form].headers);
  }
  return sh;
}

function appendRow_(form, row) {
  sheetFor_(form).appendRow(row);
}

function buildRow_(form, body, e) {
  var ts = new Date();
  var ua = header_(e, "User-Agent") || "";
  var ip = clientIp_(e);
  if (form === "join") {
    return [
      ts,
      str_(body.name),
      str_(body.email),
      str_(body.phone),
      str_(body.dob),
      str_(body.gender),
      str_(body.address),
      str_(body.social),
      str_(body.organizationType),
      str_(body.organization),
      str_(body.rotaractStatus),
      str_(body.why),
      str_(body.clubName),
      str_(body.journey),
      str_(body.hobbies),
      list_(body.contribute),
      str_(body.contributeOther),
      ua,
      ip,
    ];
  }
  if (form === "newsletter") {
    return [ts, str_(body.email), ua, ip];
  }
  return [ts, str_(body.name), str_(body.email), str_(body.phone), str_(body.message), ua, ip];
}

// ——— email (join only) ———

var SITE_URL = "https://rotaractblreast.org";
var LOGO_URL = SITE_URL + "/images/brandkit/RBEUniteRiseEmpower-crest.png";
var BRAND_ORANGE = "#ff9000";
var BRAND_INK = "#231a11";
var BRAND_MUTED = "#564334";
var BRAND_LINE = "#dcc2ae";
var BRAND_CANVAS = "#fff8f5";

function sendJoinEmails_(body) {
  var cfg = getConfig_();
  var club = cfg.clubNotifyEmail || "rotaractblreast@gmail.com";
  var replyTo = clubReplyTo_(cfg);
  var fromName = cfg.mailFromName || "Rotaract Bangalore East";
  var name = str_(body.name);
  var email = str_(body.email);

  // 1) Full application → club only (so officers have every field in their inbox)
  MailApp.sendEmail({
    to: club,
    replyTo: email,
    subject: "New join application - " + name,
    body: clubNotifyBody_(body),
    htmlBody: clubNotifyHtml_(body),
    name: fromName,
  });

  // 2) Confirmation → applicant, CC club.
  // Reply-To is always the club inbox(es), never the Apps Script owner account.
  MailApp.sendEmail({
    to: email,
    cc: club,
    replyTo: replyTo,
    subject: "We got your application - " + name + " - Rotaract Bangalore East",
    body: applicantConfirmBody_(body, replyTo, cfg),
    htmlBody: applicantConfirmHtml_(body, replyTo, cfg),
    name: fromName,
  });
}

/**
 * Sends an instant push alert to reviewers via OneSignal Web Push.
 * Only fires if oneSignalAppId and oneSignalApiKey are configured in the "Config" sheet.
 * Reviewers receive lock-screen push notifications directly through the RBE Connect PWA.
 */
function sendJoinPushNotification_(body) {
  var cfg = getConfig_();
  var appId = String(cfg.oneSignalAppId || "").trim();
  var apiKey = String(cfg.oneSignalApiKey || "").trim();
  if (!appId || !apiKey) return;

  try {
    var candidateName = str_(body.name) || "Applicant";
    var org = str_(body.organization || body.organizationType || "");
    var summary = org ? candidateName + " (" + org + ")" : candidateName;

    var portalUrl = String(cfg.portalUrl || "https://connect.rotaractblreast.org").trim();
    if (portalUrl.lastIndexOf("/") !== portalUrl.length - 1) {
      portalUrl = portalUrl + "/";
    }

    var authHeader = apiKey;
    if (authHeader.indexOf("Basic ") !== 0 && authHeader.indexOf("Key ") !== 0) {
      authHeader = "Basic " + authHeader;
    }

    var payload = {
      app_id: appId,
      included_segments: ["Total Subscriptions"],
      headings: { en: "New Member Application" },
      contents: { en: summary + " has submitted an application to join Rotaract Bangalore East." },
      url: portalUrl,
      chrome_web_icon: portalUrl + "icons/icon-192.png",
      web_buttons: [
        { id: "review-btn", text: "Review Application", url: portalUrl }
      ]
    };

    var response = UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", {
      method: "post",
      contentType: "application/json; charset=utf-8",
      headers: {
        "Authorization": authHeader
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log("OneSignal push response: " + response.getResponseCode() + " " + response.getContentText());
  } catch (err) {
    Logger.log("OneSignal push notification failed: " + err);
  }
}

/**
 * One-click push test helper: run from Apps Script editor to verify OneSignal push delivery.
 */
function testPushNotification() {
  var cfg = getConfig_();
  sendJoinPushNotification_({
    name: "Sample Applicant",
    organization: "Bangalore University",
    organizationType: "Student"
  });
  Logger.log("Test push dispatched via OneSignal App ID: " + (cfg.oneSignalAppId || "None configured"));
}

/**
 * Reply-To for the applicant thank-you: replyToEmail, plus clubNotifyEmail if different.
 * Deduped, comma-joined — MailApp accepts multiple Reply-To addresses that way.
 */
function clubReplyTo_(cfg) {
  cfg = cfg || getConfig_();
  var primary = cfg.replyToEmail || cfg.clubNotifyEmail || "rotaractblreast@gmail.com";
  var notify = cfg.clubNotifyEmail || "";
  var seen = {};
  var out = [];
  (primary + "," + notify).split(",").forEach(function (part) {
    var addr = String(part || "")
      .trim()
      .toLowerCase();
    if (addr && !seen[addr]) {
      seen[addr] = true;
      out.push(addr);
    }
  });
  return out.join(",");
}

function clubNotifyBody_(body) {
  var isStudent = str_(body.organizationType).toLowerCase() === "student";
  var lines = [
    "A new membership application arrived from the website.",
    "",
    "Quick actions to reach applicant:",
    "  WhatsApp: " + waLink_(body.phone),
    "  Call:     " + telLink_(body.phone),
    "  Email:    " + str_(body.email),
    "",
    "- Application -",
    "",
    "Name: " + str_(body.name),
    "Email: " + str_(body.email),
    "Phone: " + str_(body.phone),
    "Date of birth: " + str_(body.dob),
    "Gender: " + (str_(body.gender) || "-"),
    "Area / locality: " + str_(body.address),
    "Social: " + (str_(body.social) || "-"),
    "",
    (isStudent ? "College" : "Company") + ": " + str_(body.organization),
    "",
  ];

  if (str_(body.rotaractStatus).toLowerCase() === "experienced") {
    lines.push("Rotaract background: Current or past Rotaractor");
    lines.push("Club: " + str_(body.clubName));
    lines.push("");
    lines.push("Rotaract journey:");
    lines.push(str_(body.journey));
  } else {
    lines.push("Rotaract background: New to Rotaract");
    lines.push("");
    lines.push("Why they want to join:");
    lines.push(str_(body.why));
  }

  var other = str_(body.contributeOther);
  lines.push("");
  lines.push("Hobbies and interests:");
  lines.push(str_(body.hobbies));
  lines.push("");
  lines.push("Where they can help: " + list_(body.contribute));
  if (other) lines.push("Something else: " + other);
  lines.push("");
  lines.push("Also filed in the Join sheet.");
  lines.push("");
  return lines.join("\n");
}

function applicantConfirmBody_(body, replyTo, cfg) {
  cfg = cfg || getConfig_();
  var clubInbox = (replyTo || cfg.replyToEmail || "rotaractblreast@gmail.com").split(",")[0].trim();
  return [
    "Hi " + str_(body.name) + ",",
    "",
    "Thank you for applying to join Rotaract Bangalore East (Easterners).",
    "",
    "We’ve received your application. Our membership team will review it and get in touch",
    "within about a week with next steps - usually an invitation to meet the club at a",
    "meeting or project.",
    "",
    "If you have questions before then, just reply to this email - replies go to",
    clubInbox + " (the club), not to the automated sender.",
    "",
    "Until then, here’s where you can see what we’re up to:",
    "  Instagram - https://www.instagram.com/rotaractblreast/",
    "  Website   - https://rotaractblreast.org/",
    "",
    "UNITE · RISE · EMPOWER",
    "Rotaract Bangalore East",
  ].join("\n");
}

// ——— html email ———

/**
 * Email clients strip <style> blocks and don't support flex/grid, so everything here is
 * table-based with inline styles. Both mails also ship a plain-text `body` fallback.
 */
function emailShell_(headline, innerHtml, footerNote) {
  return [
    "<!DOCTYPE html><html><head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "</head>",
    '<body style="margin:0;padding:0;background:' + BRAND_CANVAS + ';">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' +
      BRAND_CANVAS +
      ';padding:24px 12px;">',
    "<tr><td align=\"center\">",
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ' +
      BRAND_LINE +
      ';border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">',

    // brand bar
    '<tr><td style="background:' + BRAND_ORANGE + ';height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>',

    // header
    '<tr><td style="padding:24px 28px 8px 28px;">',
    '<img src="' +
      LOGO_URL +
      '" alt="Rotaract Bangalore East" width="140" style="display:block;border:0;width:140px;max-width:100%;height:auto;">',
    "</td></tr>",

    // headline
    '<tr><td style="padding:8px 28px 0 28px;">',
    '<h1 style="margin:0;font-size:22px;line-height:1.3;color:' +
      BRAND_INK +
      ';font-weight:700;">' +
      esc_(headline) +
      "</h1>",
    "</td></tr>",

    // content
    '<tr><td style="padding:16px 28px 24px 28px;color:' +
      BRAND_INK +
      ';font-size:15px;line-height:1.6;">',
    innerHtml,
    "</td></tr>",

    // footer
    '<tr><td style="padding:18px 28px 24px 28px;border-top:1px solid ' +
      BRAND_LINE +
      ';color:' +
      BRAND_MUTED +
      ';font-size:12px;line-height:1.6;">',
    footerNote ? "<p style=\"margin:0 0 10px 0;\">" + footerNote + "</p>" : "",
    '<p style="margin:0 0 6px 0;letter-spacing:.08em;font-weight:700;color:' +
      BRAND_INK +
      ';">UNITE &middot; RISE &middot; EMPOWER</p>',
    '<p style="margin:0;">Rotaract Bangalore East &middot; Bangalore, India<br>',
    '<a href="' + SITE_URL + '" style="color:#8e4e00;">rotaractblreast.org</a> &middot; ',
    '<a href="mailto:rotaractblreast@gmail.com" style="color:#8e4e00;">rotaractblreast@gmail.com</a></p>',
    "</td></tr>",

    "</table></td></tr></table></body></html>",
  ].join("");
}

function button_(href, label) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px 0;"><tr>' +
    '<td style="background:' +
    BRAND_ORANGE +
    ';border-radius:6px;">' +
    '<a href="' +
    href +
    '" style="display:inline-block;padding:11px 22px;color:#231a11;font-weight:700;font-size:14px;text-decoration:none;">' +
    esc_(label) +
    "</a></td></tr></table>"
  );
}

function waLink_(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return "https://wa.me/" + d;
}

function telLink_(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return "tel:+91" + d;
  if (d.length === 12 && d.indexOf("91") === 0) return "tel:+" + d;
  var raw = String(phone || "").trim();
  return "tel:" + (raw.indexOf("+") === 0 ? raw : "+" + d);
}

function contactButtons_(phone, name) {
  var firstName = esc_(str_(name).split(" ")[0] || "Applicant");
  var waHref = waLink_(phone);
  var telHref = telLink_(phone);

  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px 0;"><tr>' +
    '<td style="background:#25D366;border-radius:6px;padding:0;">' +
    '<a href="' +
    waHref +
    '" style="display:inline-block;padding:11px 20px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">' +
    "WhatsApp " +
    firstName +
    "</a></td>" +
    '<td style="width:12px;">&nbsp;</td>' +
    '<td style="background:' +
    BRAND_ORANGE +
    ';border-radius:6px;padding:0;">' +
    '<a href="' +
    telHref +
    '" style="display:inline-block;padding:11px 20px;color:#231a11;font-weight:700;font-size:14px;text-decoration:none;">' +
    "Call " +
    firstName +
    "</a></td>" +
    "</tr></table>"
  );
}

function applicantConfirmHtml_(body, replyTo, cfg) {
  cfg = cfg || getConfig_();
  var clubInbox = (replyTo || cfg.replyToEmail || "rotaractblreast@gmail.com").split(",")[0].trim();
  var inner = [
    '<p style="margin:0 0 14px 0;">Hi ' + esc_(str_(body.name)) + ",</p>",
    '<p style="margin:0 0 14px 0;">Thank you for applying to join <strong>Rotaract Bangalore East</strong> (Easterners).</p>',
    '<p style="margin:0 0 14px 0;">We’ve received your application. Our membership team will review it and get in touch within about <strong>a week</strong> with next steps - usually an invitation to meet the club at a meeting or project.</p>',
    '<p style="margin:0 0 14px 0;">If you have questions before then, just reply to this email - replies go to <a href="mailto:' +
      esc_(clubInbox) +
      '" style="color:#8e4e00;">' +
      esc_(clubInbox) +
      "</a> (the club), not to the automated sender.</p>",
    button_(SITE_URL + "/news/", "See What We Do"),
    '<p style="margin:18px 0 0 0;font-size:14px;color:' +
      BRAND_MUTED +
      ';">Meanwhile, follow along on <a href="https://www.instagram.com/rotaractblreast/" style="color:#8e4e00;">Instagram</a> or browse <a href="' +
      SITE_URL +
      '/events/" style="color:#8e4e00;">our upcoming events</a>.</p>',
  ].join("");

  return emailShell_(
    "Thank you - we’ve got your application",
    inner,
    "You’re receiving this because you applied to join Rotaract Bangalore East."
  );
}

function clubNotifyHtml_(body) {
  var isStudent = str_(body.organizationType).toLowerCase() === "student";
  var isExperienced = str_(body.rotaractStatus).toLowerCase() === "experienced";

  var rows = [
    row_("Name", str_(body.name)),
    row_("Email", mailto_(str_(body.email))),
    row_("Phone", '<a href="' + telLink_(body.phone) + '" style="color:#8e4e00;">' + esc_(str_(body.phone)) + "</a>"),
    row_("Date of birth", esc_(str_(body.dob))),
    row_("Gender", esc_(str_(body.gender) || "-")),
    row_("Area / locality", esc_(str_(body.address))),
    row_("Social", esc_(str_(body.social) || "-")),
    row_(isStudent ? "College" : "Company", esc_(str_(body.organization))),
    row_("Rotaract", isExperienced ? "Current or past Rotaractor" : "New to Rotaract"),
  ];

  if (isExperienced) {
    rows.push(row_("Club", esc_(str_(body.clubName))));
    rows.push(row_("Journey", nl2br_(str_(body.journey))));
  } else {
    rows.push(row_("Why join", nl2br_(str_(body.why))));
  }

  rows.push(row_("Hobbies", nl2br_(str_(body.hobbies))));
  rows.push(row_("Can help with", esc_(list_(body.contribute))));
  if (str_(body.contributeOther)) {
    rows.push(row_("Something else", esc_(str_(body.contributeOther))));
  }

  var inner = [
    '<p style="margin:0 0 16px 0;">A new membership application arrived from the website. Use the quick action buttons below to reach out directly:</p>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;">',
    rows.join(""),
    "</table>",
    contactButtons_(body.phone, body.name),
  ].join("");

  return emailShell_(
    "New join application - " + str_(body.name),
    inner,
    "Also filed in the Join tab of the forms spreadsheet."
  );
}

function row_(label, valueHtml) {
  return (
    '<tr><td style="padding:9px 12px 9px 0;vertical-align:top;white-space:nowrap;color:' +
    BRAND_MUTED +
    ';font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #f0e4da;">' +
    esc_(label) +
    '</td><td style="padding:9px 0;vertical-align:top;color:' +
    BRAND_INK +
    ';border-bottom:1px solid #f0e4da;">' +
    (valueHtml || "-") +
    "</td></tr>"
  );
}

function mailto_(email) {
  return '<a href="mailto:' + esc_(email) + '" style="color:#8e4e00;">' + esc_(email) + "</a>";
}

/** Applicant text is untrusted — always escape before it lands in an HTML mail. */
function esc_(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br_(s) {
  return esc_(s).replace(/\n/g, "<br>");
}

// ——— helpers ———

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  var type = (e.postData.type || "").toLowerCase();
  var raw = e.postData.contents;
  if (type.indexOf("application/json") !== -1 || raw.trim().charAt(0) === "{") {
    return JSON.parse(raw);
  }
  // form-urlencoded fallback
  var out = {};
  String(raw)
    .split("&")
    .forEach(function (pair) {
      var p = pair.split("=");
      if (p[0]) out[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
    });
  return out;
}

function header_(e, name) {
  if (!e || !e.headers) return "";
  var h = e.headers;
  var lower = name.toLowerCase();
  for (var k in h) {
    if (k && k.toLowerCase() === lower) return h[k];
  }
  return "";
}

function clientIp_(e) {
  return header_(e, "X-Forwarded-For").split(",")[0].trim() || header_(e, "X-Real-IP") || "";
}

/** Trims the ends only — internal newlines from textareas must reach the sheet intact. */
function str_(v) {
  return String(v == null ? "" : v).trim();
}

/** Checkbox groups arrive as an array; flatten to one comma-separated cell. */
function list_(v) {
  if (Array.isArray(v)) {
    return v
      .map(str_)
      .filter(function (s) {
        return s;
      })
      .join(", ");
  }
  return str_(v);
}

function isEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

function isInPhone_(s) {
  var d = String(s).replace(/\D/g, "");
  if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
  return /^[6-9]\d{9}$/.test(d);
}

/**
 * One-time helper: run from the Apps Script editor (bound to the spreadsheet).
 * Creates Join / Newsletter / Contact tabs and writes the header row.
 */
function setupSpreadsheet() {
  var ss = spreadsheet_();
  Object.keys(FORMS).forEach(function (form) {
    var headers = FORMS[form].headers;
    var name = FORMS[form].sheet;
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
    } else {
      // Re-running after a schema change rewrites row 1 in place; existing rows keep their
      // original column order, so archive the sheet first if the columns actually moved.
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });
  if (typeof ensureReviewersSheet_ === "function") {
    ensureReviewersSheet_(ss);
  }
  ensureConfigSheet_(ss);
  var joinSh = ss.getSheetByName("Join");
  if (joinSh && typeof ensureJoinHeaders_ === "function") {
    ensureJoinHeaders_(joinSh);
  }
  // Remove default "Sheet1" if empty and we have our sheets
  var def = ss.getSheetByName("Sheet1");
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  Logger.log("Sheets ready on: " + ss.getUrl());
  Logger.log("Tabs: Join, Newsletter, Contact, Reviewers, Config");
}
