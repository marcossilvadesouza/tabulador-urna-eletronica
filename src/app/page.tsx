'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BoletimUrnaData, CargoApuracao } from '@/features/boletim-urna/types';
import { LogAnalysisResult } from '@/features/log-urna/types';
import { Asn1DecodeResult } from '@/features/asn1-inspector/types';
import { RelatorioAuditoria } from '@/features/auditoria/types';
import { SecaoInfo } from '@/features/storage/types';
import { ResultadoConsolidadoData } from '@/features/consolidado/types';

import { ResultadoConsolidadoView } from '@/features/consolidado/components/ResultadoConsolidadoView';
import { BoletimOverview } from '@/features/boletim-urna/components/BoletimOverview';
import { CargoSection } from '@/features/boletim-urna/components/CargoSection';
import { LogMetrics } from '@/features/log-urna/components/LogMetrics';
import { LogTimeline } from '@/features/log-urna/components/LogTimeline';
import { LogViewer } from '@/features/log-urna/components/LogViewer';
import { Asn1TreeViewer } from '@/features/asn1-inspector/components/Asn1TreeViewer';
import { PdfReconciliationView } from '@/features/auditoria/components/PdfReconciliationView';
import { SecaoTurnoSelector } from '@/features/storage/components/SecaoTurnoSelector';
import { EmptyTurnoState } from '@/features/storage/components/EmptyTurnoState';
import { Badge } from '@/components/ui/Card';

import {
  Vote,
  FileText,
  Activity,
  Binary,
  ShieldCheck,
  Upload,
  RefreshCw,
  Landmark,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Archive,
  Trophy,
  Menu,
  X,
  ChevronRight,
  Layers,
} from 'lucide-react';

export default function UrnaDashboard() {
  const [secoes, setSecoes] = useState<SecaoInfo[]>([]);
  const [selectedZona, setSelectedZona] = useState<string>('0035');
  const [selectedSecao, setSelectedSecao] = useState<string>('0574');
  const [selectedTurno, setSelectedTurno] = useState<1 | 2>(1);

  const [consolidadoData, setConsolidadoData] = useState<ResultadoConsolidadoData | null>(null);
  const [buData, setBuData] = useState<BoletimUrnaData | null>(null);
  const [logData, setLogData] = useState<LogAnalysisResult | null>(null);
  const [asn1Data, setAsn1Data] = useState<Asn1DecodeResult | null>(null);
  const [relatorioAuditoria, setRelatorioAuditoria] = useState<RelatorioAuditoria | null>(null);

  const [activeTab, setActiveTab] = useState<string>('RESULTADO');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    sub?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available sections list
  const loadSecoesList = async () => {
    try {
      const res = await fetch('/api/secoes');
      if (res.ok) {
        const d = await res.json();
        setSecoes(d.secoes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load consolidated results across all sections
  const loadConsolidado = async (turno: 1 | 2) => {
    try {
      const res = await fetch(`/api/consolidado?turno=${turno}`);
      if (res.ok) {
        setConsolidadoData(await res.json());
      }
    } catch (e) {
      console.error('Erro ao carregar consolidado:', e);
    }
  };

  // Load single section and turno data
  const loadSecaoData = async (zona: string, secao: string, turno: 1 | 2) => {
    setLoading(true);
    setBuData(null);
    setLogData(null);
    setAsn1Data(null);
    setRelatorioAuditoria(null);

    try {
      const q = `?zona=${zona}&secao=${secao}&turno=${turno}`;
      const [buRes, logRes, asn1Res, auditRes] = await Promise.all([
        fetch(`/api/boletim${q}`),
        fetch(`/api/log${q}`),
        fetch(`/api/asn1${q}`),
        fetch(`/api/auditoria${q}`),
      ]);

      if (buRes.ok) setBuData(await buRes.json());
      if (logRes.ok) setLogData(await logRes.json());
      if (asn1Res.ok) setAsn1Data(await asn1Res.json());
      if (auditRes.ok) setRelatorioAuditoria(await auditRes.json());
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: 'Erro ao carregar dados da seção.' });
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async (zona: string, secao: string, turno: 1 | 2) => {
    await Promise.all([
      loadSecoesList(),
      loadConsolidado(turno),
      loadSecaoData(zona, secao, turno),
    ]);
  };

  useEffect(() => {
    refreshAll(selectedZona, selectedSecao, selectedTurno);
  }, []);

  const handleSelectSecao = (zona: string, secao: string) => {
    setSelectedZona(zona);
    setSelectedSecao(secao);
    loadSecaoData(zona, secao, selectedTurno);
  };

  const handleSelectTurno = (turno: 1 | 2) => {
    setSelectedTurno(turno);
    loadConsolidado(turno);
    loadSecaoData(selectedZona, selectedSecao, turno);
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setNotification(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Falha no processamento');

      if (resData.secoes) {
        setSecoes(resData.secoes);
      }

      const detectedZona = resData.zona;
      const detectedSecao = resData.secao;
      const detectedTurno = resData.turno;

      setSelectedZona(detectedZona);
      setSelectedSecao(detectedSecao);
      setSelectedTurno(detectedTurno);

      const statusWord = resData.overwritten ? 'reimportado e sobrescrito' : 'armazenado e importado';

      if (resData.type === 'ZIP') {
        const fileNamesList = resData.savedFiles ? resData.savedFiles.join(', ') : '';
        setNotification({
          type: 'success',
          message: `Pacote ZIP "${file.name}" descompactado com sucesso! (${statusWord})`,
          sub: `Arquivos extraídos: [${fileNamesList}] salvos em storage/zona_${detectedZona}/secao_${detectedSecao}/turno_${detectedTurno}/ (${resData.turnoNome})`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Arquivo ${file.name} ${statusWord} com sucesso!`,
          sub: `Organizado em: storage/zona_${detectedZona}/secao_${detectedSecao}/turno_${detectedTurno}/ (${resData.turnoNome})`,
        });
      }

      await Promise.all([
        loadConsolidado(detectedTurno),
        loadSecaoData(detectedZona, detectedSecao, detectedTurno),
      ]);

      setActiveTab('RESULTADO');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const hasData = Boolean(buData || logData || (consolidadoData && consolidadoData.totalSecoesApuradas > 0));

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#070d18] flex flex-col relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-950/80 backdrop-blur-sm border-4 border-dashed border-blue-400 flex flex-col items-center justify-center pointer-events-none">
          <Archive className="w-16 h-16 text-cyan-300 animate-bounce" />
          <h2 className="text-xl font-bold text-white mt-4">Solte o arquivo para descompactar e importar</h2>
          <p className="text-xs text-slate-300 mt-1">
            Formatos aceitos: <strong>.zip (DadosDeUrna)</strong>, <strong>.dat / .bu (Boletim de Urna)</strong> ou <strong>.jez (Log)</strong>
          </p>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-[#1b2f4c] bg-[#0a1527]/95 backdrop-blur sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Alternar Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Auditoria & Engenharia Reversa da Urna
                </h1>
                <Badge variant={selectedTurno === 1 ? 'primary' : 'warning'}>
                  {selectedTurno}º Turno
                </Badge>
                {consolidadoData && (
                  <Badge variant="success">
                    {consolidadoData.totalSecoesApuradas} Seções
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                TSE &bull; Totalização &bull; Decodificação ASN.1 BER/DER (.dat) e Log (.jez)
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.dat,.bu,.jez"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{uploading ? 'Processando...' : 'Importar (.ZIP, .DAT, .JEZ)'}</span>
              <span className="sm:hidden">{uploading ? '...' : 'Importar'}</span>
            </button>
            <button
              onClick={() => refreshAll(selectedZona, selectedSecao, selectedTurno)}
              title="Recarregar dados"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container with Left Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 xl:w-72 bg-[#081220] border-b lg:border-b-0 lg:border-r border-[#172b47] flex flex-col shrink-0 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] overflow-y-auto z-20`}
        >
          <div className="p-4 space-y-6">
            {/* Group 1: Totalização */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 flex items-center justify-between">
                <span>Totalização</span>
              </div>
              <button
                onClick={() => {
                  setActiveTab('RESULTADO');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'RESULTADO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Resultado Consolidado</span>
                </div>
                {consolidadoData && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    {consolidadoData.totalSecoesApuradas}
                  </span>
                )}
              </button>
            </div>

            {/* Group 2: Boletim da Seção */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 flex items-center justify-between">
                <span>Boletim da Seção</span>
                <span className="text-[10px] font-mono text-cyan-400 lowercase">
                  Z{selectedZona}/S{selectedSecao}
                </span>
              </div>

              <div className="space-y-1">
                {/* Boletim Geral */}
                <button
                  onClick={() => {
                    setActiveTab('GERAL');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'GERAL'
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Visão Geral do BU</span>
                  </div>
                  {buData && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {buData.votacao.comparecimento}v
                    </span>
                  )}
                </button>

                {/* Sub-cargos */}
                {buData && buData.cargos.length > 0 && (
                  <div className="pt-1 pl-2 border-l border-slate-800/80 ml-3 space-y-1">
                    <div className="text-[10px] font-medium text-slate-500 uppercase px-2 py-0.5">
                      Cargos em Disputa
                    </div>
                    {buData.cargos.map((cargo) => (
                      <button
                        key={cargo.cargoId}
                        onClick={() => {
                          setActiveTab(`CARGO_${cargo.cargoId}`);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                          activeTab === `CARGO_${cargo.cargoId}`
                            ? 'bg-blue-600/25 text-white font-semibold border border-blue-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Vote className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
                          <span className="truncate">{cargo.cargoNome}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {cargo.totalApurado}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Group 3: Auditoria & Engenharia Reversa */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Auditoria & Reversa
              </div>
              <div className="space-y-1">
                {/* Auditoria & Consistência */}
                <button
                  onClick={() => {
                    setActiveTab('AUDITORIA');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'AUDITORIA'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Auditoria & Consistência</span>
                  </div>
                  {relatorioAuditoria && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        relatorioAuditoria.totalDivergencias > 0
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {relatorioAuditoria.scoreConformidade}%
                    </span>
                  )}
                </button>

                {/* Log da Urna */}
                <button
                  onClick={() => {
                    setActiveTab('LOG');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'LOG'
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Log da Urna (.jez)</span>
                  </div>
                  {logData && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {logData.totalLinhas}l
                    </span>
                  )}
                </button>

                {/* ASN.1 DER */}
                <button
                  onClick={() => {
                    setActiveTab('ASN1');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'ASN1'
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Binary className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Auditoria ASN.1 (DER)</span>
                  </div>
                  {asn1Data && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {asn1Data.nodesCount} nós
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Section Info Card */}
            {buData && (
              <div className="pt-4 border-t border-slate-800/80">
                <div className="bg-[#0b1626] border border-[#1b2f4c] rounded-xl p-3 text-slate-400 text-[11px] space-y-1.5 font-mono">
                  <div className="text-slate-300 font-sans font-semibold flex items-center justify-between">
                    <span>{buData.secao.municipioNome}</span>
                    <span className="text-cyan-400 font-bold">{buData.secao.uf}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    UE: <span className="text-white font-mono">{buData.urna.codigoIdentificacaoUE}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate" title={buData.urna.codigoCargaFormatado}>
                    Carga: <span className="text-slate-300 font-mono">{buData.urna.resumoCorrespondencia}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Section and Turno Selector Bar */}
          <SecaoTurnoSelector
            secoes={secoes}
            selectedZona={selectedZona}
            selectedSecao={selectedSecao}
            selectedTurno={selectedTurno}
            onSelectSecao={handleSelectSecao}
            onSelectTurno={handleSelectTurno}
            hideSecaoSelector={activeTab === 'RESULTADO'}
          />

        {notification && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/70 border-rose-700 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-semibold">{notification.message}</span>
                {notification.sub && (
                  <div className="text-[11px] opacity-80 font-mono mt-0.5">{notification.sub}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              &times;
            </button>
          </div>
        )}

        {loading && !consolidadoData ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            <span className="text-sm">
              Carregando dados da Zona {selectedZona}, Seção {selectedSecao} ({selectedTurno}º Turno)...
            </span>
          </div>
        ) : (
          <>
            {/* TAB: RESULTADO CONSOLIDADO */}
            {activeTab === 'RESULTADO' && (
              consolidadoData && consolidadoData.totalSecoesApuradas > 0 ? (
                <ResultadoConsolidadoView consolidado={consolidadoData} />
              ) : (
                <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-8 text-center text-slate-400 text-xs">
                  Nenhuma seção com Boletim de Urna disponível para consolidar no {selectedTurno}º Turno.
                </div>
              )
            )}

            {/* TAB: BOLETIM GERAL DA SEÇÃO */}
            {activeTab === 'GERAL' && (
              buData ? (
                <BoletimOverview data={buData} />
              ) : (
                <EmptyTurnoState
                  zona={selectedZona}
                  secao={selectedSecao}
                  turno={selectedTurno}
                  onUploadClick={() => fileInputRef.current?.click()}
                />
              )
            )}

            {/* TABS DE CARGOS DA SEÇÃO SELECIONADA */}
            {buData?.cargos.map((cargo) => {
              if (activeTab === `CARGO_${cargo.cargoId}`) {
                return <CargoSection key={cargo.cargoId} cargo={cargo} />;
              }
              return null;
            })}

            {/* TAB: LOG */}
            {activeTab === 'LOG' && (
              logData ? (
                <div className="space-y-6">
                  <LogMetrics logData={logData} />
                  <LogTimeline milestones={logData.marcosOperacionais} />
                  <LogViewer initialLines={logData.linhas} totalLinhas={logData.totalLinhas} />
                </div>
              ) : (
                <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-8 text-center text-slate-400 text-xs">
                  Arquivo de log (.jez) ainda não foi importado para este turno nesta seção.
                </div>
              )
            )}

            {/* TAB: ASN.1 DER */}
            {activeTab === 'ASN1' && (
              asn1Data ? (
                <Asn1TreeViewer
                  rootNode={asn1Data.root}
                  fileName={asn1Data.fileName}
                  fileSizeBytes={asn1Data.fileSizeBytes}
                  nodesCount={asn1Data.nodesCount}
                />
              ) : (
                <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-8 text-center text-slate-400 text-xs">
                  Arquivo binário ASN.1 (.dat) não disponível para este turno.
                </div>
              )
            )}

            {/* TAB: AUDITORIA / CONFERÊNCIA */}
            {activeTab === 'AUDITORIA' && (
              relatorioAuditoria ? (
                <PdfReconciliationView relatorio={relatorioAuditoria} />
              ) : (
                <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-8 text-center text-slate-400 text-xs">
                  Auditoria requer o Boletim de Urna (.dat) carregado nesta seção.
                </div>
              )
            )}
          </>
        )}
      </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1b2f4c] bg-[#08121f] py-4 text-center text-xs text-slate-500 font-mono">
        Engenharia Reversa e Auditoria de Urna Eletrônica &bull; Tribunal Superior Eleitoral (TSE) &bull; Armazenamento em storage/zona_XXXX/secao_YYYY/turno_Z/
      </footer>
    </div>
  );
}
