const pkg = require('../../package.json');
const utils = require('./utils');
const fse = require('fs-extra');

async function withRepo(targetDir, callback) {

    const branch = process.env.INPUT_BRANCH;

    await prepareRepo(targetDir, branch);
    await configUser(targetDir);

    await utils.exec('git', ['rm', '--quiet', '--ignore-unmatch', '-rf', '.'], targetDir)
        .then((output) => console.log(output));

    await callback();
    await publish(targetDir, branch);
}

async function prepareRepo(targetDir, branch) {

    if (('INPUT_REMOTE_URL' in process.env) && process.env.INPUT_REMOTE_URL) {

        const remoteUrl = process.env.INPUT_REMOTE_URL;

        await utils.exec('git', ['ls-remote', remoteUrl])
            .catch((error) => {

                console.warn(`Could not find remote repository ${remoteUrl}`);
                console.warn(error);
                console.log(`Create bare repository ${remoteUrl}`);

                return utils.exec('git', ['init', '--bare', remoteUrl])
                    .then((output) => console.log(output));
            });

        if (await utils.exec('git', ['ls-remote', '--heads', remoteUrl, branch])) {

            await utils.exec('git', ['clone', remoteUrl, targetDir, '--depth', '1',
                '--branch', branch, '--single-branch'])
                .then((output) => console.log(output));

        } else {

            await utils.exec('git', ['clone', remoteUrl, targetDir, '--no-checkout'])
                .then((output) => console.log(output));

            await utils.exec('git', ['checkout', '--orphan', branch], targetDir)
                .then((output) => console.log(output));
        }

    } else {

        await utils.exec('git', ['ls-remote', process.cwd()]);

        await fse.copy(process.cwd(), targetDir);

        await utils.exec('git', ['fetch', 'origin', branch, '--depth', '1'], targetDir)
            .then((output) => console.log(output))
            .then(() => {

                return utils.exec('git', ['checkout', branch], targetDir)
                    .then((output) => console.log(output));
            })
            .catch((error) => {

                console.warn(`Could not find branch ${branch}`);
                console.warn(error);
                console.log(`Create branch ${branch}`);

                return utils.exec('git', ['checkout', '--orphan', branch], targetDir)
                    .then((output) => console.log(output));
            });
    }
}

async function configUser(targetDir) {

    let username;
    let email;

    if (('INPUT_USER' in process.env) && process.env.INPUT_USER) {

        const pattern = /^([^<]*)<([^>]*)>\s*$/;
        const match = pattern.exec(process.env.INPUT_USER);

        if (match) {

            username = match[1].trim();
            email = match[2].trim();
        }

        if (!username || !email)
            throw new Error('Could not parse name and email (format should be "Full Name <email@domain.tld>")');

    } else {

        username = await utils.exec('git', ['config', 'user.name'])
            .then((value) => value.trim());

        email = await utils.exec('git', ['config', 'user.email'])
            .then((value) => value.trim());
    }

    await utils.exec('git', ['config', 'user.name', username], targetDir);
    await utils.exec('git', ['config', 'user.email', email], targetDir);
}

async function publish(targetDir, branch) {

    await utils.exec('git', ['add', '.'], targetDir)
        .then((output) => console.log(output));

    await utils.exec('git', ['commit', '-m', `Build pages with ${pkg.name}@v${pkg.version}`], targetDir)
        .then((output) => console.log(output));

    await utils.exec('git', ['push', 'origin', branch], targetDir)
        .then((output) => console.log(output));
}

module.exports = {
    withRepo,
};
