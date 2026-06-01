const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const nlpVenvDir = path.join(rootDir, 'nlp-service', 'venv');
const fs = require('fs');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
let uvicornCommand = process.platform === 'win32'
  ? path.join(nlpVenvDir, 'Scripts', 'uvicorn.exe')
  : path.join(nlpVenvDir, 'bin', 'uvicorn');

console.log('rootDir:', rootDir);
console.log('frontendDir exists:', fs.existsSync(frontendDir), frontendDir);
console.log('backendDir exists:', fs.existsSync(backendDir), backendDir);
console.log('nlpVenvDir exists:', fs.existsSync(nlpVenvDir), nlpVenvDir);
console.log('expected uvicorn path:', uvicornCommand, 'exists:', fs.existsSync(uvicornCommand));

function spawnWithLog(command, args, opts = {}) {
  console.log('spawning', command, args, 'cwd=', opts.cwd);
  return spawn(command, args, { shell: false, stdio: 'inherit', ...opts });
}

function spawnNpmDev(cwd) {
  if (process.platform === 'win32') {
    return spawnWithLog('cmd.exe', ['/c', 'npm', 'run', 'dev'], { cwd });
  }

  return spawnWithLog('npm', ['run', 'dev'], { cwd });
}

if (!fs.existsSync(frontendDir)) {
  console.error('frontend directory not found:', frontendDir);
  process.exit(1);
}

let backend;
if (fs.existsSync(backendDir) && fs.existsSync(path.join(backendDir, 'index.js'))) {
  backend = spawnWithLog(nodeCommand, [path.join(backendDir, 'index.js')], { cwd: backendDir });
} else {
  console.error('backend directory or backend/index.js not found:', backendDir);
  process.exit(1);
}

const frontend = spawnNpmDev(frontendDir);

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

const children = [backend, frontend, nlpService];
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