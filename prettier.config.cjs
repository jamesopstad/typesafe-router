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
	importOrderSortSpecifiers: true,
	plugins: [require('@trivago/prettier-plugin-sort-imports')],
};
