module.exports = {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exceedMaxHooks: 'Too many hooks ({{ usedHooks }}) per component.',
    },
  },
  create(context) {
    const { max = 15 } = context.options[0] || {};
    const hooksCount = [];

    function isMaybeReactComponent(codePath, node) {
      if (![
        'function',
        'class-field-initializer',
        'class-static-block',
      ].includes(codePath.origin)) {
        return false;
      }

      return node.id
        && /^[A-Z]/.test(node.id.name)
        && !node.id.name.endsWith('Store');
    }

    function checkNode(node) {
      if (node.type === 'CallExpression'
        && node.callee.type === 'Identifier'
        && node.callee.name.startsWith('use')) {
        hooksCount[hooksCount.length - 1]++;
      }
    }

    return {
      onCodePathStart(codePath, node) {
        if (isMaybeReactComponent(codePath, node)) {
          hooksCount.push(0);
        }
      },
      MemberExpression: checkNode,
      CallExpression: checkNode,
      onCodePathEnd(codePath, node) {
        if (!isMaybeReactComponent(codePath, node)) {
          return;
        }

        const count = hooksCount.pop();
        if (count > max) {
          context.report({
            node: node.id,
            messageId: 'exceedMaxHooks',
            data: {
              usedHooks: count,
              max,
            },
          });
        }
      },
    };
  },
};
