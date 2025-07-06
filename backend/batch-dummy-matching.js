const { execSync } = require('child_process');

function runScript(name) {
  console.log(`\n===== ${name} 실행 =====`);
  try {
    execSync(`node ${name}`, { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.error(`${name} 실행 중 오류 발생:`, e.message);
    process.exit(1);
  }
}

runScript('delete-dummy-users.js');
runScript('generate-dummy-users.js');
runScript('matching-algorithm.js');

console.log('\n=== 전체 배치 완료 ==='); 