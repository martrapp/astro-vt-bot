import { test, expect, Page } from '@playwright/test';
import { error } from 'console';

test.describe('Setup', () => {
	test('server running', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('body')).toHaveText('astro-vtbot test server');
	});
});

test.describe('Debug component', () => {
	test('shows up on both pages', async ({ page }) => {
		await page.goto('/debug/debug1/');
		await expect(page).toHaveTitle('Debug1');
		await expect(page.locator('#debugOutput')).not.toBeVisible();
		await page.locator('#debug2').click();
		await expect(page).toHaveTitle('Debug2');
		await expect(page.locator('#debugOutput')).toBeVisible();
	});
	test('does not throw', async ({ page }) => {
		let error = '';
		page.on('pageerror', err => error += err);
		await page.goto('/debug/debug1/');
		await expect(page).toHaveTitle('Debug1');
		await expect(page.locator('#debugOutput')).not.toBeVisible();
		await page.locator('#debug2').click();
		await expect(page).toHaveTitle('Debug2');
		await expect(error).toBeFalsy();
	});

});

test.describe('ReplacementSwap', () => {
	test('keeps header and footer', async ({ page }) => {
		await page.goto('/repl/one/');
		await expect(page).toHaveTitle('Repl1');
		await expect(page.locator('header')).toHaveText('Header1');
		await expect(page.locator('footer')).toHaveText('Footer1');
		await page.locator('#two').click();
		await expect(page).toHaveTitle('Repl2');
		await expect(page.locator('header')).toHaveText('Header1');
		await expect(page.locator('footer')).toHaveText('Footer1');
	});
	test('replaces main', async ({ page }) => {
		await page.goto('/repl/one/');
		await expect(page).toHaveTitle('Repl1');
		await expect(page.locator('main')).toHaveText('Main1two');
		await page.locator('#two').click();
		await expect(page).toHaveTitle('Repl2');
		await expect(page.locator('main')).toHaveText('Main2three');
	});
	test('falls back to original swap', async ({ page }) => {
		await page.goto('/repl/two/');
		await expect(page).toHaveTitle('Repl2');
		await expect(page.locator('main')).toHaveText('Main2three');
		await page.locator('#three').click();
		await expect(page).toHaveTitle('Repl3');
		await expect(page.locator('header')).toHaveText('Header3');
		await expect(page.locator('main')).toHaveText('Main3');
		await expect(page.locator('footer')).toHaveText('Footer3');
	});
	test('can swap header with footer', async ({ page }) => {
		await page.goto('/repl/one/');
		await expect(page).toHaveTitle('Repl1');
		expect(await page.locator('header:above(footer)').count()).toBe(1);
		expect(await page.locator('footer:above(header)').count()).toBe(0);
		await page.locator('#four').click();
		await expect(page).toHaveTitle('Repl4');
		expect(await page.locator('header:above(footer)').count()).toBe(0);
		expect(await page.locator('footer:above(header)').count()).toBe(1);
	});
});

test.describe('Linter component', () => {
	let consoleOutput = '';
	const captureConsole = (page: Page) => {
		consoleOutput = '';
		page.on('console', (msg) => {
			const text = msg.text();
			consoleOutput +=
				text.startsWith('[astro]') || text.startsWith('[vite]')
					? ''
					: text.replace(/background-color:.*$/, '');
		});
	}
	test('finds nested transition:persit and data-vtbot-replace attributes', async ({ page }) => {
		captureConsole(page);
		await page.goto('/linter/one/');
		await expect(page).toHaveTitle('Linter1');
		await page.locator('#totwo').click();
		await expect(page).toHaveTitle('Linter2');
		expect(consoleOutput).toBe(
			`%c[vtbot-linter] nested elements with [data-astro-transition-persist] in old DOM (/linter/one/) %o at %chtml > body > main > p%c is nested inside %o at %chtml > body > main JSHandle@node console.groupEnd%c[vtbot-linter] nested elements with [data-vtbot-replace] in new DOM (/linter/two/) %o at %chtml > body > main > p%c is nested inside %o at %chtml > body > main JSHandle@node console.groupEnd`
		);
	});
	test('finds undefined and not unique transition:persit and data-vtbot-replace attributes', async ({
		page,
	}) => {
		captureConsole(page);
		await page.goto('/linter/three/');
		await expect(page).toHaveTitle('Linter3');
		await page.locator('#tofour').click();
		await expect(page).toHaveTitle('Linter4');
		expect(consoleOutput).toBe(
			`%c[vtbot-linter] duplicate data-astro-transition-persist=a in old DOM (/linter/three/) %o at %chtml > body > main > p%c and earlier %o at %chtml > body > main > h1 JSHandle@node console.groupEnd%c[vtbot-linter] looks like an implicit name: data-astro-transition-persist=astro-pzn23gpo-1 in new DOM (/linter/four/) %o at %chtml > body > main > p JSHandle@node console.groupEnd%c[vtbot-linter] no value given for [data-vtbot-replace] in new DOM (/linter/four/) %o at %chtml > body > main > h1 JSHandle@node console.groupEnd`
		);
	});
	test('finds non unique view-transition-names', async ({ page }) => {
		captureConsole(page);
		await page.goto('/linter/five/');
		await expect(page).toHaveTitle('Linter5');
		await page.locator('#tosix').click();
		await expect(page).toHaveTitle('Linter6');
		expect(consoleOutput).toBe(
			`Unexpected duplicate view-transition-name: a%c[vtbot-linter] view transition name \"a\" is not unique in old DOM (/linter/five/) %o at %chtml > body > main > h1 JSHandle@node %o at %chtml > body > main > p JSHandle@node console.groupEnd%c[vtbot-linter] view transition name \"b\" is not unique in new DOM (/linter/six/) %o at %chtml > body > main > a JSHandle@node %o at %chtml > body > main JSHandle@node %o at %chtml > body > main > p JSHandle@node console.groupEnd`
		);
	});
	test('detect lost view transition names and styles', async ({ page }) => {
		captureConsole(page);
		await page.goto('/linter/seven/');
		await expect(page).toHaveTitle('Linter7');
		await page.locator('#toeight').click();
		await expect(page).toHaveTitle('Linter8');
		expect(consoleOutput).toBe(
			`%c[vtbot-linter] no HTMLElement with view transition name \"olaf\" exists in new DOM (/linter/eight/). Does it got overridden by transition:persist or data-vtbot-replace? %c[vtbot-linter] scoped style id \"y2uoggpx\" is not defined in new DOM (/linter/eight/).  JSHandle@node%c[vtbot-linter] The stylesheet might got optimized away or the element might have lost its styling when being copied by transition:persist or data-vtbot-replace. console.groupEnd`
		);
	});
	test('detect illegal view-transition-names', async ({ page }) => {
		captureConsole(page);
		await page.goto('/linter/nine/');
		await expect(page).toHaveTitle('Linter9');
		await page.locator('#toten').click();
		await expect(page).toHaveTitle('Linter10');
		expect(consoleOutput).toBe(
			`%c[vtbot-linter] Illegal view-transition-name(s) in old DOM (/linter/nine/) %cMaybe it starts with a number, or is a reserved word, or it contains illegal characters? %cH^rst, 5bs%c in %o at %chtml > head > style:nth-of-type(2) %c-123abc%c in %o at %chtml > body > main > p %cnone%c in %o at %chtml > body > main > h1 console.groupEnd`
		);
	});
});
