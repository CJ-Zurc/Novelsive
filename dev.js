const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const nlpVenvDir = path.join(rootDir, 'nlp-service', 'venv');
const fs = require('fs');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let uvicornCommand = process.platform === 'win32'
  ? path.join(nlpVenvDir, 'Scripts', 'uvicorn.exe')
  : path.join(nlpVenvDir, 'bin', 'uvicorn');

console.log('rootDir:', rootDir);
console.log('frontendDir exists:', fs.existsSync(frontendDir), frontendDir);
console.log('nlpVenvDir exists:', fs.existsSync(nlpVenvDir), nlpVenvDir);
console.log('expected uvicorn path:', uvicornCommand, 'exists:', fs.existsSync(uvicornCommand));

function spawnWithLog(command, args, opts = {}) {
  console.log('spawning', command, args, 'cwd=', opts.cwd);
  // Use shell on Windows to allow .cmd/.bat executables to run reliably
  const useShell = process.platform === 'win32';
  return spawn(command, args, { shell: useShell, stdio: 'inherit', ...opts });
}

if (!fs.existsSync(frontendDir)) {
  console.error('frontend directory not found:', frontendDir);
  process.exit(1);
}

const frontend = spawnWithLog(npmCommand, ['run', 'dev'], { cwd: frontendDir });

const nlpServiceDir = path.join(rootDir, 'nlp-service');

let nlpService;
if (fs.existsSync(uvicornCommand)) {
  nlpService = spawnWithLog(uvicornCommand, ['main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], { cwd: nlpServiceDir });
} else {
  // Fallback to python -m uvicorn using venv python if available
  const pythonExe = process.platform === 'win32'
    ? path.join(nlpVenvDir, 'Scripts', 'python.exe')
    : path.join(nlpVenvDir, 'bin', 'python');

  if (fs.existsSync(pythonExe)) {
    console.log('uvicorn executable not found, falling back to', pythonExe, '-m uvicorn');
    nlpService = spawnWithLog(pythonExe, ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], { cwd: nlpServiceDir });
  } else {
    console.error('No uvicorn or python executable found in venv. Please activate venv or install dependencies.');
    process.exit(1);
  }
}

const children = [frontend, nlpService];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      shutdown(0);
      return;
    }

    shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));