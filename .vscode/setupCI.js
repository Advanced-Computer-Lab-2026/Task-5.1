import fs from 'fs';
import path from 'path';

const workflowDir = path.join(process.cwd(), '.github', 'workflows');
const filePath = path.join(workflowDir, 'ci.yaml');

const ciContent = `name: Instructor Portal security tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-22.04
    env:
      MONGOMS_VERSION: 7.0.14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm               # uses the root package-lock.json
      - name: Cache mongod binary
        uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongodb-memory-server-7.0.14-\${{ runner.os }}
      - run: npm ci                 # installs the server+client workspaces
      - run: npm test --workspace server`;

if (!fs.existsSync(workflowDir)) {
  fs.mkdirSync(workflowDir, { recursive: true });
}
fs.writeFileSync(filePath, ciContent, { encoding: 'utf8' });
