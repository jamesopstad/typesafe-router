module.exports = {
	singleQuote: true,
	useTabs: true,
	overrides: [
		{
			files: '*.md',
			options: {
				useTabs: false,
			},
		},
	],
	plugins: [require('@trivago/prettier-plugin-sort-imports')],
};
