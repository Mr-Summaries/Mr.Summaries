import { visitParents } from 'unist-util-visit-parents';

export default function remarkMergeSvg() {
  return (tree: any) => {
    visitParents(tree, 'html', (node: any, ancestors: any[]) => {
      // Check if this node is an HTML node that contains an SVG-related tag
      const match = /<\s*(svg|g|defs|marker|path|line|circle|rect|polygon|polyline|ellipse|text|use|image|symbol|clipPath|linearGradient|radialGradient|stop|pattern|mask|filter|feGaussianBlur|feOffset|feMerge|feMergeNode|feComposite|feColorMatrix|feFlood|feImage|feTile|feTurbulence|feDisplacementMap|feBlend|feComponentTransfer|feFuncR|feFuncG|feFuncB|feFuncA|feConvolveMatrix|feDiffuseLighting|feDistantLight|fePointLight|feSpotLight|feSpecularLighting|feMorphology|feDropShadow|animate|animateMotion|animateTransform|mpath|set|view|foreignObject|switch|desc|title|metadata)(?:\s|>|\/>)/i.exec(node.value);
      
      if (match) {
        const tagName = match[1].toLowerCase();
        let svgContent = node.value;
        
        // Check if it's self-closing or has a closing tag in the same node
        // Note: this is a simple check and might fail on nested tags of the same name,
        // but it's sufficient for recovering truncated markdown.
        const selfClosingRegex = new RegExp(`<\\s*${tagName}[^>]*/>`, 'i');
        const closingTagRegex = new RegExp(`</\\s*${tagName}\\s*>`, 'i');
        
        let hasClosingTag = selfClosingRegex.test(svgContent) || closingTagRegex.test(svgContent);

        if (!hasClosingTag) {
          // We need to consume subsequent nodes until we find the closing tag
          // We iterate through the ancestors from bottom to top
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const ancestor = ancestors[i];
            const childNode = i === ancestors.length - 1 ? node : ancestors[i + 1];
            const childIndex = ancestor.children.indexOf(childNode);
            
            let endIndex = childIndex;
            
            for (let j = childIndex + 1; j < ancestor.children.length; j++) {
              const futureNode = ancestor.children[j];
              
              const getNodeText = (n: any): string => {
                if (n.value) return n.value;
                if (n.children) return n.children.map(getNodeText).join('');
                return '';
              };
              
              const futureText = getNodeText(futureNode);
              const separator = ancestor.type === 'root' ? '\n\n' : (ancestor.type === 'paragraph' ? '\n' : '');
              svgContent += separator + futureText;
              
              endIndex = j;
              
              if (closingTagRegex.test(futureText) || selfClosingRegex.test(futureText)) {
                hasClosingTag = true;
                break;
              }
            }
            
            // Remove the consumed siblings
            if (endIndex > childIndex) {
              ancestor.children.splice(childIndex + 1, endIndex - childIndex);
            }
            
            if (hasClosingTag) {
              break;
            }
          }
        }

        // Always convert to a code block
        node.type = 'code';
        node.lang = 'svg';
        node.value = svgContent;
      }
    });
  };
}
