import { writeExcelFixtures } from '../tests/helpers/excel-fixtures.js';

await writeExcelFixtures();
console.log('Fixtures gerados em tests/fixtures/');
