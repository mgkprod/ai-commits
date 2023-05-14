import { showHUD, AI, Clipboard, getFrontmostApplication, confirmAlert, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { getSelectedFinderWindow, getSelectedTerminalWindow } from "./utils"
import { generatePrompt } from "./prompt";

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
  const { locale, length, commitType, model } = await getPreferenceValues();

  const prompt = `
  ${generatePrompt(locale, length, commitType)}

  \`\`\`
  ${diff}
  \`\`\`
  `

  console.debug(`Prompt is: ${prompt}`)

  const answer = (await AI.ask(prompt, {
    creativity: 0.7,
    model
  })).trim();

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
