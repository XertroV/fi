import winston from 'winston';

const l = winston;
winston.configure({transports: [new winston.transports.Console()]})

export const parseWhitespaceTree = (input) => {
  l.debug(`Input type: ${typeof input}`)
  const _lines = input.split('\n').map(l => l.split('--')[0]).filter(v => v.replace(/[ \(\)]/g, '').length > 0);
  const _depths = _lines.map(v => v.length - v.replace(/^ */, '').length)

  if (_depths[0] !== 0) {
    l.error("Error: first line (root) cannot be indented")
    throw Error("Error: first line (root) cannot be indented")
  }

  const childDepth = _depths[1];

  // make depths integer multiple of first depth
  const depths = _depths.map(d => d / childDepth | 0);
  const lines = _lines.map(l => l.replace(/^ */, '').split('--')[0].replace(') ::', '::').replace(/[\()]/g, ''));
  const root = lines[0];

  const mkNode = (nodeName, parent) => {
    const newNode = { n: nodeName, cs: [], p: parent || null };
    if (!!parent) {
      parent.cs.push(newNode)
    }
    return newNode
  }
  const tree = mkNode(root)

  let lastDepth = 0;
  let currNode = tree;
  let i = 1;
  while (i < depths.length) {
    // sibling
    if (depths[i] === lastDepth) {
      if (lines[i].slice(0, 3) === ":: ") {
        // then we have type info for a group (the previous child)
        currNode.groupInfo = lines[i].slice(3);
      } else {
        currNode = mkNode(lines[i], currNode.p)
      }
    }
    // descending; cant do more than 1 step at a time while descending
    else if (depths[i] === lastDepth + 1) {
      currNode = mkNode(lines[i], currNode)
      lastDepth = depths[i]
    }
    // descending too fast
    else if (depths[i] > lastDepth) {
      // error -- descending too fast
      l.error(`descending too fast`, lines, depths, input)
      throw Error('error: descended too fast')
    }
    // ascending -- can do more than 1 level at once
    else if (depths[i] < lastDepth) {
      currNode = currNode.p;
      lastDepth--;
      // don't increment i, just ascend till we find a sibling
      continue;
    }
    else {
      // error
      l.error(`got here, not sure how`, lines, depths, input)
      throw Error('not sure how i got here')
    }

    lastDepth = depths[i];
    i++;
  }

  return tree;
}


export const prettyPrintTree = (tree, justReturnStr=false) => {
  const inner = (tree) => {
    // don't print tree.parent (circular refs)
    return {...tree, cs: tree.cs.map(inner), p: undefined}
  }
  const ppTree = JSON.stringify(inner(tree), null, 2);
  if (!justReturnStr) {
    l.info(ppTree);
  }
  return ppTree;
}


export const treeToMmd = (tree) => {
  const inner = (t, nName) => {
    const _nodeName = (nName || 'r');

    const childLinks = t.cs.map((child, i) => {
      return `${_nodeName} --- ${inner(child, [_nodeName, i.toString()].join('-'))}`
    })

    if (t.n.replace(/ /g, '') === '') {
      return ''
    }

    /* hack to draw lots of subgraphs to maintain ordering of children */
    t.groupInfo = t.groupInfo ? t.groupInfo : '#nbsp;';
    const subGraphInfo = `subgraph sg-${_nodeName} ["${t.groupInfo}"]`;

    const afterNodeData = t.cs.length > 0 ? `${subGraphInfo}
${childLinks.join('\n')}
${subGraphInfo.length > 0 ? 'end' : ''}` : '';

    return `${_nodeName}["${t.n}"]
${afterNodeData}`
  }

  return `graph TD
${inner(tree)}
`
}


export const autoGenImgFromDomEl = el => {
  const child1 = el.childNodes[0];
  if (child1.nodeName === "CODE" && el.parentElement.parentElement.classList.contains("language-plaintext")) {
    const grammarTreeSrc = child1.innerHTML;
    console.log(`raw grammar src:`, grammarTreeSrc)
    const grammarTree = parseWhitespaceTree(grammarTreeSrc);
    console.log(`grammar tree:`, grammarTree);
    console.log(prettyPrintTree(grammarTree));

    mmdEl = document.createElement("pre")
    mmdEl.classList.add("mmd")
    mmdEl.innerHTML = treeToMmd(grammarTree);
    console.log(`mermaid render:`)
    console.log(mmdEl.innerHTML)
    /* mmdEl.appendChild(document.createTextNode(treeToMmd(grammarTree))) */
    el.parentNode.appendChild(mmdEl)

    // note: seems like there were multiple ways to get images rendered via mermaid.ink, formattingOptions used in the less-good-way
    const formattingOptions = "IEVbMV1cblxuQyAtLT4gRlsyXSIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6ZmFsc2V9";
    const diagramEncoded = btoa(JSON.stringify({code: mmdEl.innerHTML, mermaid: {}, updateEditor: true}));

    const mkLink = (url, innerHTML) => {
      const newLink = document.createElement("a");
      newLink.href = url;
      newLink.target = "_blank";
      newLink.innerHTML = innerHTML
      return newLink
    }

    const linkToImage = mkLink(`https://mermaid.ink/img/${diagramEncoded}`, "View JPEG")
    const linkToSVG = mkLink(`https://mermaid.ink/svg/${diagramEncoded}`, "View SVG")
    const linkToEdit = mkLink(`https://mermaid-js.github.io/mermaid-live-editor/#/edit/${diagramEncoded}`, "Edit (Mermaid)")

    // el.parentNode.appendChild(linkToImage)
    const mkSep = () => document.createTextNode(" | ")
    const links = [linkToImage, linkToSVG, linkToEdit].map(v => [mkSep(), v]).flat().slice(1)
    el.parentNode.append(...links);
  }
}
