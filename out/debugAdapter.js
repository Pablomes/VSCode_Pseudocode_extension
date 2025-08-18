const { spawn } = require("child_process");

function run(cmd, args) {
  const proc = spawn(cmd, args, { stdio: "inherit", shell: true });
  proc.on("close", (code) => process.exit(code));
}

if (process.argv.includes("--server")) {
  // optional: implement Debug Adapter Protocol here
} else {
  // fallback: just run pseudor on the compiled file
  const file = process.env.VSCODE_DEBUG_TARGET || process.argv[2];
  run("pseudor", [file]);
}
