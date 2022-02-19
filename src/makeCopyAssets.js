const fse = require('fs-extra');

async function main() {

    fse.mkdirpSync('./dist/css/highlighting');

    // copy default CSS file for asciidoctor
    await fse.copy('./node_modules/@asciidoctor/core/dist/css', './dist/css');

    // copy CSS files for syntax asciidoctor-highlight
    await fse.copy('./node_modules/highlight.js/styles', './dist/css/highlighting');
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
    main,
};
