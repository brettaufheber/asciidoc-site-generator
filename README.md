# asciidoc-site-generator

This project is a static website generator using AsciiDoc files and Handlebars templates.

There is also the project
[asciidoc-with-gh-pages-action](https://github.com/brettaufheber/asciidoc-with-gh-pages-action#readme)
to use this static website generator as a GitHub Action to deploy a website using GitHub Pages.

## Installation

Install asciidoc-site-generator with npm:

```sh
npm install --save asciidoc-site-generator
```

## Usage

The generated output can be deployed either into a directory or to a Git repository.
Each of the two use cases has its own command.

The configuration for the generator can be passed by parameters or by environment variables.
For a complete list of parameters and environment variables, display the help view for each instruction.

Deploy a static website into a directory

```sh
node /path/to/generator build -h # shows how to use the command

node /path/to/generator build \
  --resources-paths ./path-to-project \
  --pages-path ./output-directory
```

Deploy a static website with version control

```sh
node /path/to/generator build-and-publish -h # shows how to use the command

node /path/to/generator build-and-publish \
  --resources-paths ./path-to-project \
  --branch my-output-branch \
  --remote-url my-repo-url \
  --user "My Name <email@domain.tld>"
```

The remote URL parameter is not required if this application is running inside the root directory of a Git project and
will be determined automatically in this case.

The user parameter is only required if neither a user is configured globally nor is configured in the current working
directory.

## The file structure of a project

Each resource directory processed by the generator can contain the following directories and files.

* **/static/** - All files in this directory are copied directly to the output.
* **/documents/** - The AsciiDoc (.adoc) files which will be converted into HTML files.
* **/stylesheets/** - CSS files or SCSS, Sass, Less files which need to be compiled.
* **/collections/** - Some YAML and JSON files providing data available for templating.
* **/templates/** - The [Handlebars](https://handlebarsjs.com/guide/) template files.
  In order to allow maximum flexibility for web development, the generated HTML content is passed to Handlebars
  templates, allowing for a complete separation of content and web design.
  This static website generator comes with
  some [basic Handlebars helpers](https://github.com/brettaufheber/basic-handlebars-helpers#readme).
* **/dependencies.json** - An optional file which lists some packages automatically deployed to the output.
  The notation used for the [dependencies](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#dependencies) is
  the same as for a package.json file. An example file can be
  viewed [here](https://github.com/brettaufheber/asciidoc-site-generator/blob/main/test/theme/dependencies.json).

It is recommended to spread the structure across several resource directories.
This makes it possible to separate files into web content, theme and translations, for example.

## Example project

To simplify the first steps with the static website generator, an example can be used.

The example project has two resource directories:

* [Web content](https://github.com/brettaufheber/asciidoc-site-generator/tree/main/test/content)
* [Theme](https://github.com/brettaufheber/asciidoc-site-generator/tree/main/test/theme)

Build the example project

```sh
node . build -i "./test/content,./test/theme" -o "pages"
```

## MIT License

Copyright (c) 2022 Eric Löffler (brettaufheber)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
