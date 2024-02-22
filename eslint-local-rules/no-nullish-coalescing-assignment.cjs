module.exports = {
  meta: {
    messages: {
      unexpected: 'Unexpected use of nullish coalescing assignment operator (??=)',
    },
  },
  create(context) {
    return {
      AssignmentExpression(node) {
        if (node.operator === '??=') {
          context.report({ node, messageId: 'unexpected' });
        }
      },
    };
  },
};
