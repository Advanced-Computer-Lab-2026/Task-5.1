// Offline checks: real controllers, Joi, bcrypt and Mongoose schema; database
// calls are mocked. HTTP/sanitizer/storage integration is covered by Jest.
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { Instructor } from '../src/models/Instructor.js';
import { loginInstructor, searchInstructors, getDirectory } from '../src/controllers/instructorController.js';

afterEach(() => mock.restoreAll());
const secrets = ['password', 'apiKey', 'privateEmail', 'privatePhone'];
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; } };
}
function unexpected(err) { throw err; }

for (const [label, body] of [
  ['Attack 1 $ne', { username: { $ne: null }, password: { $ne: null } }],
  ['Attack 1 $gt', { username: { $gt: '' }, password: { $gt: '' } }],
  ...['^S', '^Se', '^S3', '^S3cr3t-Admin-Pw!$', '^X'].map(prefix =>
    [`Attack 3 ${prefix}`, { username: 'admin', password: { $regex: prefix } }]),
  ['array', { username: ['admin'], password: 'secret' }],
  ['number', { username: 'admin', password: 123 }],
  ['null', { username: null, password: 'secret' }],
  ['missing password', { username: 'admin' }],
  ['unknown field', { username: 'admin', password: 'secret', role: 'superadmin' }],
  ['bcrypt byte limit', { username: 'admin', password: 'é'.repeat(37) }]
]) {
  test(`login rejects ${label} before querying`, async () => {
    const find = mock.method(Instructor, 'findOne', () => { throw new Error('Database reached'); });
    const res = response();
    await loginInstructor({ body }, res, unexpected);
    assert.equal(res.statusCode, 400);
    assert.equal(find.mock.callCount(), 0);
    assert.equal(res.body.instructor, undefined);
  });
}

for (const [label, query] of [
  ['Attack 2 $ne', { role: { $ne: 'instructor' } }],
  ['Attack 2 $regex', { username: { $regex: '^admin' } }],
  ['Attack 2 bracket key', { 'role[$ne]': 'instructor' }],
  ['Attack 4 password', { $where: 'this.password.length>10' }],
  ['Attack 4 apiKey', { $where: "this.apiKey && this.apiKey.indexOf('sk_live')===0" }],
  ['dotted key', { 'name.$ne': 'Smith' }],
  ['array', { name: ['Smith', 'Jones'] }],
  ['private filter', { privateEmail: 'root@university.edu' }]
]) {
  test(`search rejects ${label} before querying`, async () => {
    const find = mock.method(Instructor, 'find', () => { throw new Error('Database reached'); });
    const res = response();
    await searchInstructors({ query }, res, unexpected);
    assert.equal(res.statusCode, 400);
    assert.equal(find.mock.callCount(), 0);
  });
}

const hash = await bcrypt.hash('correct password', 4);
for (const [password, status] of [['correct password', 200], ['wrong', 401]]) {
  test(`honest login returns ${status}`, async () => {
    mock.method(Instructor, 'findOne', filter => {
      assert.deepEqual(filter, { username: 'admin' });
      return { select: async fields => {
        assert.equal(fields, '+password');
        return { _id: '123', name: 'Admin', username: 'admin', role: 'superadmin',
          department: 'IT', password: hash, apiKey: 'secret', privateEmail: 'secret' };
      } };
    });
    const res = response();
    await loginInstructor({ body: { username: 'admin', password } }, res, unexpected);
    assert.equal(res.statusCode, status);
    for (const key of secrets) assert.equal(res.body.instructor?.[key], undefined);
  });
}

for (const [name, expected] of [['sMiTh', 'sMiTh'], ['.*', '\\.\\*'], ['[a]+(b)$', '\\[a\\]\\+\\(b\\)\\$']]) {
  test(`search builds a literal filter for ${name}`, async () => {
    mock.method(Instructor, 'find', filter => {
      assert.deepEqual(filter, { name: { $regex: expected, $options: 'i' }, department: 'CS' });
      return { select(fields) {
        assert.equal(fields, '_id name department role');
        return { sort: () => ({ lean: async () => [] }) };
      } };
    });
    const res = response();
    await searchInstructors({ query: { name, department: 'CS' } }, res, unexpected);
    assert.deepEqual(res.body, { count: 0, instructors: [] });
  });
}

test('directory uses an inclusive public projection', async () => {
  mock.method(Instructor, 'find', () => ({ select(fields) {
    assert.equal(fields, '_id name department role');
    return { sort: () => ({ lean: async () => [] }) };
  } }));
  const res = response();
  await getDirectory({}, res, unexpected);
  assert.deepEqual(res.body, { instructors: [] });
});

test('private fields are excluded by default', () => {
  for (const key of secrets) assert.equal(Instructor.schema.path(key).options.select, false);
});

test('save hook hashes passwords and does not rehash unchanged passwords', async () => {
  const doc = new Instructor({ name: 'Test', username: 'test', password: 'correct password' });
  const runHook = () => new Promise((resolve, reject) => {
    Instructor.schema.s.hooks.execPre('save', doc, [], err => err ? reject(err) : resolve());
  });
  await runHook();
  assert.notEqual(doc.password, 'correct password');
  assert.equal(await bcrypt.compare('correct password', doc.password), true);
  const savedHash = doc.password;
  doc.$__reset();
  await runHook();
  assert.equal(doc.password, savedHash);
});
