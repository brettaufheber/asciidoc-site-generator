const os = require('os');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const cp = require('child_process');

async function exec(command, args, cwd) {

    return new Promise((resolve, reject) => {

        const child = cp.spawn(command, Array.isArray(args) ? args : [args], {cwd: cwd || process.cwd()});
        const buffer = [];

        child.stdout.on('data', chunk => {

            buffer.push(chunk.toString());
        });

        child.stderr.on('data', chunk => {

            buffer.push(chunk.toString());
        });

        child.on('close', code => {

            const output = buffer.join('');

            if (code === 0)
                resolve(output);
            else {

                const message = output || `Process failed with code ${code}`;
                const error = new Error(message);

                Object.assign(error, {code: code});

                reject(error);
            }
        });
    });
}

async function withTempDir(prefix, callback) {

    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));

    try {

        await callback(targetDir);

    } finally {

        fse.removeSync(targetDir);
    }
}

async function transformFiles(source, target, extensions, extensionTo, callback) {

    if (fs.existsSync(source) && !path.basename(source).startsWith('.')) {

        if (fs.statSync(source).isDirectory()) {

            if (!fs.existsSync(target))
                fse.mkdirpSync(target);

            await fs.promises.readdir(source)
                .then((files) => Promise.all(files.map((file) =>
                    transformFiles(path.join(source, file), path.join(target, file), extensions, extensionTo, callback)
                )));

        } else if (fs.statSync(source).isFile()) {

            if (extensions.filter((x) => path.extname(source) === '.' + x).length !== 0) {

                const targetParentPath = path.dirname(target);
                const targetFileName = path.basename(source, path.extname(source)) + '.' + extensionTo;

                await callback(source, path.join(targetParentPath, targetFileName));
            }
        }
    }
}

async function collectFiles(source, extensions, callback) {

    if (fs.existsSync(source) && !path.basename(source).startsWith('.')) {

        if (fs.statSync(source).isDirectory()) {

            return fs.promises.readdir(source)
                .then((files) => Promise.all(files.map((file) =>
                    collectFiles(path.join(source, file), extensions, callback)
                )))
                .then((array) => Object.assign({}, ...array));

        } else if (fs.statSync(source).isFile()) {

            if (extensions.filter((x) => path.extname(source) === '.' + x).length !== 0) {

                return callback(source)
                    .then((value) => {

                        const object = {};
                        const basename = path.basename(source);
                        const key = basename.substring(0, basename.indexOf('.'));

                        object[key] = value;

                        return object;
                    });
            }
        }
    }

    return {};
}

module.exports = {
    exec,
    withTempDir,
    transformFiles,
    collectFiles,
};
