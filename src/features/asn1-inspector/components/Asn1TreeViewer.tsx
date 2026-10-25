import React, { useState } from 'react';
import { Asn1Node } from '../types';
import { ChevronRight, ChevronDown, Binary, Tag, Hash, FileCode, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/Card';

function Asn1TreeNode({
  node,
  selectedNode,
  onSelect,
}: {
  node: Asn1Node;
  selectedNode: Asn1Node | null;
  onSelect: (node: Asn1Node) => void;
}) {
  const [isOpen, setIsOpen] = useState(node.depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode?.offset === node.offset && selectedNode?.tagHex === node.tagHex;

  return (
    <div className="text-xs font-mono">
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-600/30 text-white border border-blue-500/60'
            : 'text-slate-300 hover:bg-slate-800/60'
        }`}
        style={{ paddingLeft: `${node.depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-0.5 text-slate-400 hover:text-white"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 inline-block" />
        )}

        <span className="text-amber-400 font-bold">{node.tagHex}</span>

        <span
          className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold uppercase ${
            node.isConstructed ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {node.typeName}
        </span>

        <span className="text-slate-500 text-[11px]">len: {node.length}b</span>

        {node.number !== undefined && (
          <span className="text-emerald-400 font-bold truncate max-w-xs">
            = {node.number}
          </span>
        )}

        {node.text !== undefined && (
          <span className="text-cyan-300 truncate max-w-sm">
            "{node.text}"
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, idx) => (
            <Asn1TreeNode
              key={`${child.offset}_${idx}`}
              node={child}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Asn1TreeViewer({
  rootNode,
  fileName,
  fileSizeBytes,
  nodesCount,
}: {
  rootNode: Asn1Node;
  fileName: string;
  fileSizeBytes: number;
  nodesCount: number;
}) {
  const [selectedNode, setSelectedNode] = useState<Asn1Node | null>(rootNode);

  return (
    <div className="space-y-6">
      {/* Overview Info Bar */}
      <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Auditoria de Estrutura ASN.1 DER (Engenharia Reversa)
            </h3>
            <Badge variant="warning">DER Low-Level</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arquivo analisado: <strong className="text-white font-mono">{fileName}</strong> ({fileSizeBytes.toLocaleString('pt-BR')} bytes) &bull; Total de nós TLV: <strong className="text-white font-mono">{nodesCount}</strong>
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/60 font-mono">
          Especificação: <strong className="text-emerald-400">TSE bu.asn1 (v2)</strong>
        </div>
      </div>

      {/* Two Columns: Tree vs Node Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Tree */}
        <div className="lg:col-span-7 bg-[#0b1626] border border-[#1e3557] rounded-xl p-4 max-h-[680px] overflow-y-auto shadow-inner">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Árvore Hierárquica TLV (Tag, Length, Value)
          </div>
          <Asn1TreeNode
            node={rootNode}
            selectedNode={selectedNode}
            onSelect={setSelectedNode}
          />
        </div>

        {/* Right: Selected Node Detail */}
        <div className="lg:col-span-5 bg-[#0f1d32] border border-[#1e3557] rounded-xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              Inspeção do Nó Selecionado
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {selectedNode?.path || 'Nenhum nó selecionado'}
            </span>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Tag (Hex / Num)</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {selectedNode.tagHex} ({selectedNode.tagNum})
                  </span>
                </div>
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Classe da Tag</span>
                  <span className="text-indigo-300 font-semibold text-sm">
                    {selectedNode.tagClass}
                  </span>
                </div>
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Offset no Arquivo</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {selectedNode.offset} (0x{selectedNode.offset.toString(16)})
                  </span>
                </div>
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Tamanho do Conteúdo</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {selectedNode.length} bytes
                  </span>
                </div>
              </div>

              {selectedNode.text !== undefined && (
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Texto Decodificado (ASCII / UTF-8):</span>
                  <span className="text-cyan-300 font-bold break-all">
                    "{selectedNode.text}"
                  </span>
                </div>
              )}

              {selectedNode.number !== undefined && (
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Inteiro Decodificado:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {selectedNode.number}
                  </span>
                </div>
              )}

              {selectedNode.rawBytesPreview && (
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Preview Hexadecimal dos Bytes:</span>
                  <div className="text-slate-300 bg-black/40 p-2 rounded text-[11px] break-all">
                    {selectedNode.rawBytesPreview.match(/.{1,2}/g)?.join(' ')}
                  </div>
                </div>
              )}

              {selectedNode.children && (
                <div className="bg-[#091322] p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Filhos Contidos:</span>
                  <span className="text-white font-semibold">
                    {selectedNode.children.length} nós aninhados
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic">
              Selecione um nó na árvore à esquerda para visualizar sua composição binária.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
