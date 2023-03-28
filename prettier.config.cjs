module.exports = {
	singleQuote: true,
	useTabs: true,
	overrides: [
		{
			files: '*.md',
			options: {
				useTabs: false,
				plugins: [],
			},
		},
	],
	plugins: [require('@trivago/prettier-plugin-sort-imports')],
};
