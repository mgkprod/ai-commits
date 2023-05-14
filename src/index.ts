import { showHUD, AI, Clipboard, getFrontmostApplication, confirmAlert, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getSelectedFinderWindow, getSelectedTerminalWindow } from "./utils"
import { spawnSync } from "node:child_process";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating commit message…",
  });

  // Retrieve current path from depending on the current application focused
  const frontmostApplication = await getFrontmostApplication();
  console.log(`The frontmost application is: ${frontmostApplication.name}`);
  let currentPath = ""

  switch (frontmostApplication.name) {
    case "Finder":
      currentPath = await getSelectedFinderWindow();
      break;
    case "iTerm":
    case "iTerm2":
      currentPath = await getSelectedTerminalWindow();
      break;
    default:
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = "No supported application focused";
      return;
  }

  if (!currentPath) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = "No path found";
    return;
  }

  console.log(`The current path is: ${currentPath}`)

  // Execute git diff command
  const { stdout: diff } = spawnSync('git', ['diff', '--diff-algorithm=minimal'], { cwd: currentPath });

  console.log(`Diff is: ${diff}`)

  // Use Raycast AI to generate a commit message
  const { locale, length } = await getPreferenceValues();

  let answer = await AI.ask(`
    Generate a concise git commit message written in present tense for the following code diff with the given specifications below:
    Message language: ${locale}
    Commit message must be a maximum of ${length} characters.
    Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.

    \`\`\`
    ${diff}
    \`\`\`
  `);

  // Remove leading and trailing spaces from the answer
  answer = answer.trim()
  console.log(`Generated commit message: ${answer}`)

  // Show the message in Raycast interface
  toast.style = Toast.Style.Success;
  toast.title = "Commit message generated";
  toast.message = answer;

  if (!await confirmAlert({
    title: "Commit message generated",
    message: answer,
    primaryAction: {
      title: "Copy to Clipboard",
    },
  })) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = "Action cancelled"
    return
  }

  console.log("Confirmed");

  // Copy the message to the clipboard
  await Clipboard.copy(answer);
  showHUD("Copied to clipboard");
}
