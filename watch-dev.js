import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import deepmerge from 'deepmerge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browser = process.argv[2];

if (!browser || !['chrome', 'firefox', 'edge'].includes(browser)) {
  console.error('Usage: node watch-dev.js <chrome|firefox|edge>');
  process.exit(1);
}

console.log(`🔄 Starting watch mode for ${browser} extension...`);

// Paths
const distDir = path.join(__dirname, 'dist-dev');
const buildDir = path.join(__dirname, 'build-dev', browser);
const manifestBasePath = path.join(__dirname, 'manifests', 'manifest.base.json');
const manifestBrowserPath = path.join(__dirname, 'manifests', `manifest.${browser}.json`);

let viteProcess = null;
let isBuilding = false;

// Function to start Vite in watch mode
function startVite() {
  console.log('🚀 Starting Vite in watch mode...');
  viteProcess = spawn('npm', ['run', 'build:vite:dev', '--', '--watch'], {
    stdio: 'inherit',
    shell: true
  });

  viteProcess.on('error', (error) => {
    console.error('❌ Vite process error:', error);
  });

  viteProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Vite process exited with code ${code}`);
    }
  });
}

// Function to copy files and process manifests
function buildExtension() {
  if (isBuilding) return;
  isBuilding = true;

  try {
    console.log('📦 Building extension files...');

    // Clean and create build directory
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });

    // Read and merge manifests
    let manifest = {};

    // Read base manifest
    if (fs.existsSync(manifestBasePath)) {
      const baseManifest = JSON.parse(fs.readFileSync(manifestBasePath, 'utf8'));
      manifest = baseManifest;
    } else {
      console.warn('⚠️  manifests/manifest.base.json not found, creating minimal manifest');
      manifest = {
        manifest_version: 3,
        name: "NewTab Extension (DEV)",
        version: "1.0.0-dev",
        description: "A stylish replacement for your new tab (Development Version).",
        chrome_url_overrides: {
          newtab: "index.html"
        },
        permissions: ["storage"],
        host_permissions: ["https://*/*", "http://*/*"]
      };
    }

    // Add DEV suffix to name for development builds
    if (manifest.name && !manifest.name.includes('(DEV)')) {
      manifest.name = manifest.name + ' (DEV)';
    }

    // Read browser-specific manifest
    if (fs.existsSync(manifestBrowserPath)) {
      const browserManifest = JSON.parse(fs.readFileSync(manifestBrowserPath, 'utf8'));
      manifest = deepmerge(manifest, browserManifest);
    }

    // Write merged manifest to build directory
    fs.writeFileSync(
      path.join(buildDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Copy dist files to build directory
    function copyRecursive(src, dest) {
      if (!fs.existsSync(src)) {
        return;
      }

      const stats = fs.statSync(src);
      
      if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        files.forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    }

    // Copy all files from dist-dev to build directory, except manifest files
    copyRecursive(distDir, buildDir);

    // Copy icon from icons directory
    const iconPath = path.join(__dirname, 'icons', 'icon.png');
    const iconDestPath = path.join(buildDir, 'icon.png');
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, iconDestPath);
    }

    // Remove copied manifest files (we only need the merged one)
    const manifestFiles = ['manifest.base.json', 'manifest.chrome.json', 'manifest.firefox.json', 'manifest.edge.json'];
    manifestFiles.forEach(file => {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    console.log(`✅ Extension files updated for ${browser}!`);
  } catch (error) {
    console.error('❌ Error building extension:', error);
  } finally {
    isBuilding = false;
  }
}

// Watch for changes in dist-dev directory
const watcher = chokidar.watch(distDir, {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (filePath) => {
  console.log(`📁 File changed: ${path.relative(__dirname, filePath)}`);
  setTimeout(buildExtension, 100); // Small delay to ensure file is fully written
});

watcher.on('add', (filePath) => {
  console.log(`📁 File added: ${path.relative(__dirname, filePath)}`);
  setTimeout(buildExtension, 100);
});

watcher.on('unlink', (filePath) => {
  console.log(`📁 File removed: ${path.relative(__dirname, filePath)}`);
  setTimeout(buildExtension, 100);
});

// Watch for changes in manifest files
const manifestWatcher = chokidar.watch([manifestBasePath, manifestBrowserPath], {
  persistent: true,
  ignoreInitial: true
});

manifestWatcher.on('change', (filePath) => {
  console.log(`📄 Manifest changed: ${path.relative(__dirname, filePath)}`);
  buildExtension();
});

// Initial build
setTimeout(() => {
  buildExtension();
}, 2000); // Wait for Vite to create initial files

// Start Vite
startVite();

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping watch mode...');
  if (viteProcess) {
    viteProcess.kill();
  }
  watcher.close();
  manifestWatcher.close();
  process.exit(0);
});

console.log(`👀 Watching for changes... Press Ctrl+C to stop`);
console.log(`📂 Extension will be built to: ${buildDir}`);
