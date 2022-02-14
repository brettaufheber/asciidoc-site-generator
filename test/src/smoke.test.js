const config = require('../../src/config.json');
const utils = require('../../src/lib/utils');
const tasks = require('../../src/lib/tasks');
const app = require('../../src/index');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const tempDir = './tmp';

beforeAll(() => {
    fse.removeSync(tempDir);
    fse.mkdirpSync(tempDir);
});

const checkResources = async function (pagesPath) {

    expect(fs.existsSync(path.join(pagesPath, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/.keep'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/file2.txt'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/asciidoctor.css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/examples/css-example.css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/examples/sass-example.css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/examples/scss-example.css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/examples/less-example.css'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/css/highlighting'))).toBe(true);
    expect(fs.existsSync(path.join(pagesPath, 'asset/node_modules'))).toBe(true);

    const dependencies = await fs.promises.readFile(path.join('./test/theme/dependencies.json'))
        .then((input) => JSON.parse(input.toString()));

    Object.keys(dependencies).forEach((dependency) => {

        expect(fs.existsSync(path.join(pagesPath, 'asset/node_modules', dependency))).toBe(true);
    });
};

test(`smoke test for "${config.commands.build.name}" command`, async () => {

    process.env['INPUT_RESOURCES_PATHS'] = './test/content, ./test/theme';
    process.env['INPUT_PAGES_PATH'] = path.join(tempDir, 'pages');

    await app.build({}, [
        tasks.installDependencies,
        tasks.copyResources,
        tasks.compileStylesheets,
        tasks.renderHtmlDocuments
    ]);

    await checkResources(path.join(tempDir, 'pages'));
});

test(`smoke test for "${config.commands.buildAndPublish.name}" command`, async () => {

    process.env['INPUT_RESOURCES_PATHS'] = './test/content, ./test/theme';
    process.env['INPUT_BRANCH'] = 'pages';
    process.env['INPUT_REMOTE_URL'] = path.join(tempDir, 'test-repo.git');
    process.env['INPUT_USER'] = 'Build Bot <bot@domain.tld>';

    await app.buildAndPublish({}, [
        tasks.installDependencies,
        tasks.copyResources,
        tasks.compileStylesheets,
        tasks.renderHtmlDocuments
    ]);

    await utils.exec('git',
        [
            'clone', process.env.INPUT_REMOTE_URL, path.join(tempDir, 'test-repo-clone'),
            '--branch', process.env.INPUT_BRANCH, '--single-branch'
        ])
        .then((output) => console.log(output));

    await checkResources(path.join(tempDir, 'test-repo-clone'));
});
