const pkg = require('../package.json');
const config = require('./config.json');
const utils = require('./lib/utils');
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

    program
        .version(pkg.version)
        .description(pkg.description);

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

    // add cli parameters
    addOption(program, config.options.common);

    program.parse();

    // put arguments into process.env
    setEnvVars(program.opts(), config.options.common);

    await build({}, getDefaultTasks());
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
    getDefaultTasks,
    main,
};
