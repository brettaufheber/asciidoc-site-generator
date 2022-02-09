const pkg = require('../../package.json');
const utils = require('./utils');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const sass = require('sass');
const less = require('less');
const hbs = require('handlebars');
const asciidoc = require('basic-handlebars-helpers').utils.asciidoc;
const asciidoctor = require('asciidoctor')();

// register Handlebars helpers
require('basic-handlebars-helpers').helpers.register();

// setup AsciiDoc for Handlebars helpers
asciidoc.setupAsciidoctor(asciidoctor, {
    'linkcss': true,
    'stylesdir': './asset/css',
    'stylesheet': 'asciidoctor.css'
});

async function installDependencies(resourcesPath, pagesPath) {

    if (fs.existsSync(path.join(resourcesPath, 'dependencies.json'))) {

        console.log(`Copy dependencies (target ${path.join(pagesPath, 'asset/node_modules')})`);

        fse.mkdirpSync(path.join(pagesPath, 'asset/node_modules'));

        await utils.withTempDir(pkg.name, async (targetDir) => {

            const packageJson = {
                'private': true,
                'dependencies': {}
            };

            packageJson.dependencies = await fs.promises.readFile(path.join(resourcesPath, 'dependencies.json'))
                .then((input) => JSON.parse(input.toString()));

            await fs.promises.writeFile(path.join(targetDir, './package.json'), JSON.stringify(packageJson, null, 2));

            await utils.exec('npm', 'install', targetDir)
                .then((output) => console.log(output));

            await fse.copy(path.join(targetDir, 'node_modules'), path.join(pagesPath, 'asset/node_modules'));
        });

    } else {

        console.log(`Skip copying dependencies`);
    }
}

async function copyResources(resourcesPath, pagesPath) {

    console.log(`Copy static files (target ${pagesPath})`);

    fse.mkdirpSync(path.join(pagesPath, 'asset/css'));

    if (fs.existsSync('./node_modules')) {

        // copy default CSS file for asciidoctor
        await fse.copy('./node_modules/@asciidoctor/core/dist/css', path.join(pagesPath, 'asset/css'));

    } else {

        // copy all CSS files from dist directory
        await fse.copy(path.join(__dirname, 'css'), path.join(pagesPath, 'asset/css'));
    }

    // copy all static resources
    if (fs.existsSync(path.join(resourcesPath, 'static')))
        await fse.copy(path.join(resourcesPath, 'static'), pagesPath);
}

async function compileStylesheets(resourcesPath, pagesPath) {

    const transformation = {
        css: async function (source, target) {

            console.log(`Copy CSS file (source ${source}) (target ${target})`);

            await fs.promises.copyFile(source, target);
        },
        sass: async function (source, target) {

            console.log(`Compile SCSS/Sass file (source ${source}) to CSS (target ${target})`);

            await sass.compileAsync(source)
                .then((output) => fs.promises.writeFile(target, output.css));
        },
        less: async function (source, target) {

            console.log(`Compile Less file (source ${source}) to CSS (target ${target})`);

            await fs.promises.readFile(source)
                .then((input) => less.render(input.toString()))
                .then((output) => fs.promises.writeFile(target, output.css));
        }
    };

    const sourceDir = path.join(resourcesPath, 'stylesheets');
    const targetDir = path.join(pagesPath, 'asset/css');

    await Promise.all([
        utils.transformFiles(sourceDir, targetDir, ['css'], 'css', transformation.css),
        utils.transformFiles(sourceDir, targetDir, ['sass', 'scss'], 'css', transformation.sass),
        utils.transformFiles(sourceDir, targetDir, ['less'], 'css', transformation.less)
    ]);
}

async function renderHtmlDocuments(resourcesPath, pagesPath, metadata) {

    const search = {
        hbs: async (source) => {

            console.log(`Compile Handlebars template (source ${source})`);

            return fs.promises.readFile(source)
                .then((input) => hbs.compile(input.toString()));
        },
        yaml: async (source) => {

            console.log(`Read YAML collection file (source ${source})`);

            return fs.promises.readFile(source)
                .then((input) => yaml.loadAll(input.toString()))
                .then((array) => Object.assign({}, ...array));
        },
        json: async (source) => {

            console.log(`Read JSON collection file (source ${source})`);

            return fs.promises.readFile(source)
                .then((input) => JSON.parse(input.toString()));
        }
    };

    const templatesPromise = utils.collectFiles(path.join(resourcesPath, 'templates'), ['hbs'], search.hbs)
        .then((templates) => hbs.registerPartial(templates));

    const yamlDocuments = utils.collectFiles(path.join(resourcesPath, 'collections'), ['yaml', 'yml'], search.yaml);
    const jsonDocuments = utils.collectFiles(path.join(resourcesPath, 'collections'), ['json'], search.json);

    const collections = await Promise.all([yamlDocuments, jsonDocuments])
        .then((array) => Object.assign({}, ...array));

    await templatesPromise;
    const templateMain = hbs.compile('{{> main}}');

    const transformation = {
        adoc: async function (source, target) {

            console.log(`Convert from AsciiDoc (source ${source}) to HTML (target ${target})`);

            const doc = asciidoc.loadFile(source, path.join(resourcesPath, 'documents'));

            const options = {
                generator: {
                    name: pkg.name,
                    version: pkg.version,
                    description: pkg.description,
                    homepage: pkg.homepage,
                },
                content: doc.convert(),
                attributes: doc.getAttributes(),
                collections: collections
            };

            await fs.promises.writeFile(target, templateMain(Object.assign({}, options, metadata)));
        }
    };

    await utils.transformFiles(path.join(resourcesPath, 'documents'), pagesPath, ['adoc'], 'html', transformation.adoc);
}

module.exports = {
    installDependencies,
    copyResources,
    compileStylesheets,
    renderHtmlDocuments,
};
