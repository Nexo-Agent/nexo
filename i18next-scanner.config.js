module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    // Use ! to filter out files or directories
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/node_modules/**',
    '!src/**/dist/**',
    '!src/**/*.d.ts',
  ],
  output: './',
  options: {
    debug: false,
    func: {
      list: ['t', 'i18next.t', 'i18n.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    trans: false, // Disable Trans component parsing since we don't use it
    lngs: ['en', 'vi'],
    defaultLng: 'vi',
    defaultNs: 'common',
    ns: ['common', 'chat', 'settings'], // Define all namespaces
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
      loadPath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      savePath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
    nsSeparator: ':',
    keySeparator: '.',
    interpolation: {
      prefix: '{{',
      suffix: '}}',
    },
    removeUnusedKeys: false,
    sort: true,
    context: false,
    contextFallback: false,
    contextDefaultValues: [],
    contextSeparator: '_',
    plural: false,
    pluralSeparator: '_',
    compatibilityJSON: 'v4',
    metadata: {},
    allowDynamicKeys: false,
  },
};
