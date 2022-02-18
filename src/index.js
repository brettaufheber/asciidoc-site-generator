const pkg = require('../package.json');
const config = require('./config.json');
const utils = require('./lib/utils');
const git = require('./lib/git');
const tasks = require('./lib/tasks');
const fse = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const {Command, Option} = require('commander');

async function build(metadata, taskCallbacks) {

    let pagesPath = path.normalize(process.env.INPUT_PAGES_PATH);

    await utils.withTempDir(pkg.name, async (resourcesPath) => {

        await mergeResources(resourcesPath);

        for (const callback of taskCallbacks)
            await callback(resourcesPath, pagesPath, metadata);
    });
}

async function buildAndPublish(metadata, taskCallbacks) {

    await utils.withTempDir(pkg.name, async (resourcesPath) => {

        await utils.withTempDir(pkg.name, async (pagesPath) => {

            await git.withRepo(pagesPath, async () => {

                await mergeResources(resourcesPath);

                for (const callback of taskCallbacks)
                    await callback(resourcesPath, pagesPath, metadata);
            });
        });
    });
}

function getDefaultTasks() {

    return [
        tasks.installDependencies,
        tasks.copyResources,
        tasks.compileStylesheets,
        tasks.renderHtmlDocuments
    ];
}

async function mergeResources(resourcesPath) {

    const paths = process.env.INPUT_RESOURCES_PATHS.split(',')
        .map((x) => x.trim())
        .filter((x) => x.length !== 0);

    for (const currentPath of paths.slice().reverse())
        await fse.copy(currentPath, resourcesPath);
}

async function main() {

    dotenv.config();

    const program = new Command();
    let target;

    program
        .version(pkg.version)
        .description(pkg.description);

    const commandBuild = new Command()
        .command(config.commands.build.name)
        .description(config.commands.build.description);

    const commandBuildAndPublish = new Command()
        .command(config.commands.buildAndPublish.name)
        .description(config.commands.buildAndPublish.description);

    const addOption = (command, optionsDef) => {

        optionsDef.forEach((x) => {

            if (x.default == null)
                command.addOption(new Option(x.parameter, x.description).env(x.mapping.env));
            else
                command.addOption(new Option(x.parameter, x.description).default(x.default).env(x.mapping.env));
        });
    };

    const setEnvVars = (args, optionsDef) => {

        for (const [key, value] of Object.entries(args)) {

            const entry = optionsDef.find((x) => x.mapping.key === key);

            process.env[entry.mapping.env] = value;
        }
    };

    // add cli parameters for build command
    addOption(commandBuild, config.options.common.concat(config.options.build));

    // add cli parameters for build-and-publish command
    addOption(commandBuildAndPublish, config.options.common.concat(config.options.buildAndPublish));

    commandBuild.action((args) => {

        target = build;
        setEnvVars(args, config.options.common.concat(config.options.build));
    });

    commandBuildAndPublish.action((args) => {

        target = buildAndPublish;
        setEnvVars(args, config.options.common.concat(config.options.buildAndPublish));
    });

    program.addCommand(commandBuild);
    program.addCommand(commandBuildAndPublish);

    program.parse();

    if (!target)
        throw new Error('No target command specified');

    await target({}, getDefaultTasks());
}

if (require.main === module) {

    main()
        .catch((error) => {

            console.error(`An error occurred during execution`);
            console.error(error);

            process.exitCode = 1;
        });
}

module.exports = {
    build,
    buildAndPublish,
    getDefaultTasks,
    main,
};
