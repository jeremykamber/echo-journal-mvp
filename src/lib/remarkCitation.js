import { visit } from 'unist-util-visit';

// remarkCitation: replaces [cite:entryId] with a custom citation node
export default function remarkCitation() {
    return (tree) => {
        visit(tree, 'text', (node, index, parent) => {
            const regex = /\[cite:([a-zA-Z0-9_-]+)\]/g;
            let match;
            const newNodes = [];
            let lastIndex = 0;
            while ((match = regex.exec(node.value)) !== null) {
                if (match.index > lastIndex) {
                    newNodes.push({
                        type: 'text',
                        value: node.value.slice(lastIndex, match.index),
                    });
                }
                newNodes.push({
                    type: 'citation',
                    data: {
                        hName: 'citation',
                        hProperties: { entryid: match[1] }, // <--- THIS IS THE KEY
                    },
                });
                lastIndex = regex.lastIndex;
            }
            if (lastIndex < node.value.length) {
                newNodes.push({
                    type: 'text',
                    value: node.value.slice(lastIndex),
                });
            }
            if (newNodes.length) {
                parent.children.splice(index, 1, ...newNodes);
                return index + newNodes.length;
            }
        });
    };
}
