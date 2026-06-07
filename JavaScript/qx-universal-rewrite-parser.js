from pathlib import Path

js = r'''/*
 * qx-universal-rewrite-parser.js
 * Purpose: Best-effort converter for Surge .sgmodule / Loon .plugin rewrite-script sections
 * Output: Quantumult X rewrite snippet lines.
 *
 * Use as Quantumult X resource parser, not as [rewrite_local] or normal local script:
 * [general]
 * resource_parser_url = https://your-cdn.example.com/qx-universal-rewrite-parser.js
 *
 * Then import the Surge/Loon module URL under [rewrite_remote] if your QX version invokes the parser for that resource.
 *
 * Limits:
 * - Resource parser cannot fetch external files. It only sees $resource.content.
 * - It cannot automatically add [mitm], [filter_local], [task_local] into different QX sections.
 * - Header add/del/replace, mock-body, map-local and parameterized plugin UI are not losslessly convertible.
 */

const RAW = ($resource && $resource.content) || "";
const SOURCE = (($resource && $resource.link) || "").toString();

function done(content) {
  $done({ content });
}

function splitArgs(s) {
  const out = [];
  let cur = "";
  let quote = null;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === "\\") {
      cur += ch;
      esc = true;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function splitComma(s) {
  const out = [];
  let cur = "";
  let quote = null;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === "\\") {
      cur += ch;
      esc = true;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function stripInlineComment(line) {
  // Do not strip # inside URLs/fragments too aggressively. Only common whole-line comments are removed elsewhere.
  return line.trim();
}

function normReject(op) {
  return op.replace(/_/g, "-").toLowerCase();
}

function parseKvList(s) {
  const kv = {};
  for (const part of splitComma(s)) {
    const m = part.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const k = m[1].trim().toLowerCase();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    kv[k] = v;
  }
  return kv;
}

function qxScriptLine(pattern, scriptPath, side, requiresBody) {
  if (!pattern || !scriptPath) return null;
  if (side === "request") {
    return `${pattern} url ${requiresBody ? "script-request-body" : "script-request-header"} ${scriptPath}`;
  }
  if (side === "response") {
    return `${pattern} url ${requiresBody ? "script-response-body" : "script-response-header"} ${scriptPath}`;
  }
  return null;
}

function convertLoonRewrite(line) {
  const t = splitArgs(line);
  if (t.length < 2) return null;

  const pattern = t[0];
  const op0 = t[1];
  const op = normReject(op0);
  const rest = t.slice(2);

  if (["reject", "reject-200", "reject-img", "reject-dict", "reject-array"].includes(op)) {
    return [`${pattern} url ${op}`];
  }

  if (op === "302" || op === "307") {
    if (!rest[0]) return null;
    return [`${pattern} url ${op} ${rest.join(" ")}`];
  }

  if (op === "header") {
    // Loon/Surge header URL rewrite has no exact QX equivalent.
    if (rest[0]) return [`# UNSUPPORTED(header-url-rewrite): ${line}`];
    return null;
  }

  if (op === "request-body-json-jq") {
    return rest[0] ? [`${pattern} url jsonjq-request-body ${rest.join(" ")}`] : null;
  }

  if (op === "response-body-json-jq") {
    return rest[0] ? [`${pattern} url jsonjq-response-body ${rest.join(" ")}`] : null;
  }

  if (op === "request-body-replace-regex" || op === "response-body-replace-regex") {
    const qxOp = op.startsWith("request") ? "request-body" : "response-body";
    const lines = [];
    for (let i = 0; i + 1 < rest.length; i += 2) {
      lines.push(`${pattern} url ${qxOp} ${rest[i]} ${qxOp} ${rest[i + 1]}`);
    }
    return lines.length ? lines : null;
  }

  // Loon header-add/header-del/header-replace/header-replace-regex cannot be converted safely
  // into QX request-header/response-header full-header regex replacement.
  if (/^(header-|response-header-|mock-)/.test(op)) {
    return [`# UNSUPPORTED(${op}): ${line}`];
  }

  return [`# UNSUPPORTED(${op0}): ${line}`];
}

function convertSurgeUrlRewrite(line) {
  const t = splitArgs(line);
  if (t.length < 3) return null;

  const pattern = t[0];
  const replacement = t[1];
  const op = normReject(t[t.length - 1]);

  if (["reject", "reject-200", "reject-img", "reject-dict", "reject-array"].includes(op)) {
    return [`${pattern} url ${op}`];
  }
  if (op === "302" || op === "307") {
    return [`${pattern} url ${op} ${replacement}`];
  }
  if (op === "header") {
    return [`# UNSUPPORTED(Surge header mode; no exact QX equivalent): ${line}`];
  }
  return [`# UNSUPPORTED(Surge URL Rewrite ${op}): ${line}`];
}

function convertLoonScript(line) {
  const m = line.match(/^(http-request|http-response)\s+(\S+)\s+(.+)$/i);
  if (!m) {
    if (/^cron\s+/i.test(line) || /^network-changed\s+/i.test(line) || /^generic\s+/i.test(line)) {
      return [`# TASK_OR_GENERIC_NOT_IN_REWRITE_REMOTE: ${line}`];
    }
    return null;
  }

  const type = m[1].toLowerCase();
  const pattern = m[2];
  const kv = parseKvList(m[3]);
  const scriptPath = kv["script-path"] || kv["script_path"];
  const requiresBody = String(kv["requires-body"] || kv["requires_body"] || "").toLowerCase() === "true";
  const qx = qxScriptLine(pattern, scriptPath, type === "http-request" ? "request" : "response", requiresBody);
  return qx ? [qx] : [`# UNSUPPORTED(script missing script-path): ${line}`];
}

function convertSurgeScript(line) {
  // name = type=http-response, pattern=..., script-path=...
  const eq = line.indexOf("=");
  if (eq < 0) return null;

  const name = line.slice(0, eq).trim();
  const kv = parseKvList(line.slice(eq + 1));
  const type = (kv.type || "").toLowerCase();
  const pattern = kv.pattern;
  const scriptPath = kv["script-path"] || kv["script_path"];
  const requiresBody = String(kv["requires-body"] || kv["requires_body"] || "").toLowerCase() === "true";

  if (type === "http-request" || type === "http-response") {
    const qx = qxScriptLine(pattern, scriptPath, type === "http-request" ? "request" : "response", requiresBody);
    return qx ? [qx] : [`# UNSUPPORTED(Surge script ${name}, missing pattern/script-path): ${line}`];
  }

  if (type === "cron" || type === "event" || type === "generic" || type === "dns" || type === "rule") {
    return [`# TASK_OR_NON_HTTP_SCRIPT_NOT_IN_REWRITE_REMOTE: ${line}`];
  }

  return [`# UNSUPPORTED(Surge script type=${type || "unknown"}): ${line}`];
}

function collectMitm(section, line, mitmHosts) {
  if (section === "mitm") {
    // Loon plugin [mitm]: bare hostname lines; Surge [MITM]: hostname = ...
    if (/^hostname\s*=/i.test(line)) {
      const rhs = line.replace(/^hostname\s*=\s*/i, "").replace(/%APPEND%|%INSERT%/g, "").trim();
      if (rhs) mitmHosts.push(rhs);
    } else if (!line.includes("=")) {
      mitmHosts.push(line.trim());
    }
  }
}

function main() {
  const out = [];
  const mitmHosts = [];
  let section = "";

  out.push(`# Converted by qx-universal-rewrite-parser.js`);
  if (SOURCE) out.push(`# Source: ${SOURCE}`);
  out.push(`# Output type: Quantumult X rewrite snippet`);
  out.push("");

  for (const rawLine of RAW.split(/\r?\n/)) {
    let line = stripInlineComment(rawLine);
    if (!line) continue;
    if (/^\s*[;#]/.test(line) || /^\s*\/\//.test(line)) continue;

    const sm = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sm) {
      section = sm[1].trim().toLowerCase();
      continue;
    }

    // Normalize section names.
    const sec = section
      .replace(/^url rewrite$/i, "url rewrite")
      .replace(/^rewrite$/i, "rewrite")
      .replace(/^script$/i, "script")
      .replace(/^mitm$/i, "mitm");

    collectMitm(sec, line, mitmHosts);

    let converted = null;

    if (sec === "url rewrite") {
      converted = convertSurgeUrlRewrite(line);
    } else if (sec === "rewrite") {
      converted = convertLoonRewrite(line);
    } else if (sec === "script") {
      // Surge script lines contain "name = type=..."; Loon script lines start with http-request/http-response/cron...
      if (/^(http-request|http-response|cron|network-changed|generic)\s+/i.test(line)) {
        converted = convertLoonScript(line);
      } else {
        converted = convertSurgeScript(line);
      }
    }

    if (converted && converted.length) out.push(...converted);
  }

  if (mitmHosts.length) {
    out.push("");
    out.push("# ---- MITM hostnames detected; QX rewrite_remote cannot usually install these automatically. ----");
    out.push(`# Add manually under [mitm]:`);
    out.push(`# hostname = ${mitmHosts.join(", ")}`);
  }

  const body = out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  done(body);
}

try {
  main();
} catch (e) {
  $done({ error: `Parser failed: ${e && e.message ? e.message : String(e)}` });
}
'''

path = Path("/mnt/data/qx-universal-rewrite-parser.js")
path.write_text(js, encoding="utf-8")
print(f"Created: {path}")
print(f"Size: {path.stat().st_size} bytes")
