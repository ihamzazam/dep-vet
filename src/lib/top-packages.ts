/**
 * Bundled list of high-profile npm package names, used as typosquat targets.
 *
 * Research note: no free API hands you typosquat detection, so DepVet ships its
 * own list and computes edit distance against it (see typosquat.ts). This is a
 * curated Day-1 seed (popular + frequently-impersonated packages). Day 2: swap
 * for a generated top-1000 JSON. Keep names lowercase, unscoped.
 */
export const TOP_PACKAGES: string[] = [
  // ubiquitous
  "lodash", "react", "react-dom", "express", "axios", "chalk", "commander",
  "debug", "request", "moment", "async", "bluebird", "underscore", "colors",
  "cross-env", "dotenv", "uuid", "semver", "glob", "rimraf", "mkdirp",
  "minimist", "yargs", "inquirer", "prompts", "ora", "boxen", "figlet",
  // build / tooling
  "webpack", "vite", "rollup", "esbuild", "babel-core", "typescript",
  "ts-node", "tslib", "eslint", "prettier", "postcss", "autoprefixer",
  "tailwindcss", "sass", "less", "nodemon", "concurrently", "npm-run-all",
  "cross-spawn", "execa", "shelljs", "fs-extra", "chokidar",
  // frameworks / server
  "next", "nuxt", "vue", "svelte", "angular", "koa", "fastify", "hapi",
  "nestjs", "socket.io", "ws", "body-parser", "cookie-parser", "cors",
  "helmet", "morgan", "passport", "jsonwebtoken", "bcrypt", "bcryptjs",
  "multer", "nodemailer", "ejs", "pug", "handlebars",
  // data / db
  "mongoose", "mongodb", "sequelize", "knex", "pg", "mysql", "mysql2",
  "redis", "ioredis", "prisma", "typeorm", "sqlite3", "node-fetch",
  "got", "superagent", "form-data", "qs", "query-string",
  // utils
  "ramda", "immer", "rxjs", "date-fns", "dayjs", "luxon", "zod", "yup",
  "joi", "ajv", "classnames", "clsx", "nanoid", "shortid", "ms",
  "pluralize", "slugify", "validator", "sanitize-html", "dompurify",
  "marked", "highlight.js", "prismjs", "cheerio", "jsdom", "puppeteer",
  "playwright", "jest", "mocha", "chai", "sinon", "vitest", "supertest",
  "enzyme", "cypress", "nock", "faker", "@faker-js/faker",
  // react ecosystem
  "redux", "react-redux", "@reduxjs/toolkit", "react-router", "react-router-dom",
  "styled-components", "emotion", "@emotion/react", "framer-motion",
  "react-query", "@tanstack/react-query", "swr", "formik", "react-hook-form",
  "recharts", "d3", "three", "lottie-web", "react-spring",
  // node platform
  "pm2", "winston", "pino", "bunyan", "log4js", "config", "convict",
  "node-cron", "bull", "amqplib", "kafkajs", "aws-sdk", "@aws-sdk/client-s3",
  "stripe", "twilio", "sendgrid", "firebase", "firebase-admin",
  "graphql", "apollo-server", "@apollo/client", "graphql-tag",
  // misc commonly-typosquatted
  "left-pad", "is-odd", "is-even", "is-number", "kind-of", "color",
  "colorette", "ansi-styles", "strip-ansi", "wrap-ansi", "string-width",
  "object-assign", "deepmerge", "merge", "extend", "clone", "deep-equal",
  "fast-json-stable-stringify", "json5", "yaml", "ini", "toml",
  "tar", "adm-zip", "archiver", "unzipper", "node-gyp", "node-sass",
];

export const TOP_PACKAGE_SET: Set<string> = new Set(TOP_PACKAGES);
