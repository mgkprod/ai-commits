import { spawnSync } from "node:child_process";
import fs from "node:fs";

export async function runAppleScript(script: string) {
  const locale = process.env.LC_ALL;
  delete process.env.LC_ALL;
  const { stdout } = spawnSync("osascript", ["-e", script]);
  process.env.LC_ALL = locale;
  return stdout.toString();
}

export async function getSelectedFinderWindow() {
  const script = `
    if application "Finder" is running and frontmost of application "Finder" then
      tell app "Finder"
        set finderWindow to window 1
        set finderWindowPath to (POSIX path of (target of finderWindow as alias))
        return finderWindowPath
      end tell
    else
      error "Could not get the selected Finder window"
    end if
 `;

  const path = (await runAppleScript(script));
  const result = path.trim();

  return result;
}

export async function getSelectedTerminalWindow() {
  const script = `
    tell application "iTerm"
      activate
      tell current session of current window
        write text "pwd > /tmp/iterm_pwd"
        return
      end tell
    end tell
  `;
  await runAppleScript(script);

  // Wait until the file /tmp/iterm_pwd exists
  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (fs.existsSync("/tmp/iterm_pwd")) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });

  // Read the /tmp/iterm_pwd file
  const path = fs.readFileSync("/tmp/iterm_pwd", "utf-8");
  const result = path.trim();

  return result;
}