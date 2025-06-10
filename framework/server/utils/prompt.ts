import readline from 'readline';

// todo: low/med doesn't work in Docker Compose
// https://stackoverflow.com/questions/53106678/docker-compose-up-and-user-inputs-on-stdin
export default async function prompt(
  question: string,
  timeout = 5 * 60 * 1000,
) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((succ, fail) => {
    const timer = setTimeout(() => {
      rl.close();
      fail(new Error('prompt timed out'));
    }, timeout);

    const dockerWarning = process.env.IS_DOCKER ? '(prompt may not work in Docker) ' : '';
    rl.question(`${question} ${dockerWarning}`, input => {
      clearTimeout(timer);
      rl.close();
      succ(input);
    });
  });
}
