import readline from 'readline';

export default async function prompt(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>(succ => {
    rl.question(`${question} `, input => {
      rl.close();
      succ(input);
    });
  });
}
