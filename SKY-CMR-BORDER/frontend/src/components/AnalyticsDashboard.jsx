import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp,
  DollarSign,
  Truck,
  Package,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileText,
  X
} from 'lucide-react';
import { useCmr } from '../context/CmrContext';
import { AiDataChatPanel } from './AiDataChatPanel';
import { DEFAULT_SAVED_CMRS } from '../utils/archiveSeed';

export const AnalyticsDashboard = () => {
  const { theme, setFields, setActivePad, showToast } = useCmr();

  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState(null);
  const [routesData, setRoutesData] = useState(null);
  const [commodities, setCommodities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const isDark = theme === 'dark';

  const computeFallbackData = (seedDocs) => {
    const total_shipments = seedDocs.length;
    let total_val = 0;
    let total_wt = 0;
    seedDocs.forEach(d => {
      const v = parseFloat((d.value || '0').replace(/[^\d.]/g, '')) || 0;
      const w = parseFloat((d.gross_weight || '0').replace(/[^\d.]/g, '')) || 0;
      total_val += v;
      total_wt += w;
    });

    setOverview({
      total_shipments,
      total_declared_value_usd: total_val,
      total_gross_weight_kg: total_wt,
      total_gross_weight_tons: +(total_wt / 1000).toFixed(2),
      avg_shipment_value_usd: +(total_val / total_shipments).toFixed(2),
      active_dispatched: total_shipments - 1,
      delivered: 1,
      fleet: { unique_trucks: 6, unique_drivers: 4, unique_consignees: 5 }
    });

    setTimeseries({
      dates: ['2026-08-20', '2026-08-22', '2026-08-24', '2026-08-26', '2026-08-28', '2026-08-30'],
      shipments: [1, 3, 2, 2, 2, 2],
      values_usd: [43488, 131976, 88774, 87550, 44856, 45034],
      weights_kg: [10765, 30320, 20310, 20710, 10565, 10950]
    });

    setRoutesData({
      countries: [
        { name: 'India 🇮🇳', value: 9 },
        { name: 'Uzbekistan 🇺🇿', value: 1 },
        { name: 'Germany 🇩🇪', value: 1 },
        { name: 'Turkey 🇹🇷', value: 1 }
      ]
    });

    setCommodities([
      { name: 'Green & Black Raisins', value: 5, weight_kg: 50685, value_usd: 209238 },
      { name: 'Roasted Pistachios', value: 2, weight_kg: 33450, value_usd: 120000 },
      { name: 'Industrial Machinery', value: 1, weight_kg: 18900, value_usd: 340000 },
      { name: 'Dried Figs AAA', value: 2, weight_kg: 21000, value_usd: 88000 },
      { name: 'Afghan Brooms', value: 2, weight_kg: 19575, value_usd: 2400 }
    ]);
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [ovRes, tsRes, rtRes, cmRes, docRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/timeseries'),
        fetch('/api/analytics/routes'),
        fetch('/api/analytics/commodities'),
        fetch('/api/documents')
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (tsRes.ok) setTimeseries(await tsRes.json());
      if (rtRes.ok) setRoutesData(await rtRes.json());
      if (cmRes.ok) setCommodities(await cmRes.json());
      if (docRes.ok) {
        const docs = await docRes.json();
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
        }
      } else {
        const mapped = DEFAULT_SAVED_CMRS.map(d => ({
          id: d.id,
          cmr_number: d.cmr_number,
          consignor: d.consignor,
          origin: d.origin,
          consignee: d.consignee,
          destination: d.destination,
          commodity: d.commodity,
          gross_weight: d.gross_weight,
          value: d.value,
          truck: d.truck,
          driver: d.driver,
          status: '🟢 Dispatched',
          fullData: { fields: d.fields }
        }));
        setDocuments(mapped);
        if (mapped.length > 0 && !selectedDoc) setSelectedDoc(mapped[0]);
        computeFallbackData(DEFAULT_SAVED_CMRS);
      }
    } catch (err) {
      const mapped = DEFAULT_SAVED_CMRS.map(d => ({
        id: d.id,
        cmr_number: d.cmr_number,
        consignor: d.consignor,
        origin: d.origin,
        consignee: d.consignee,
        destination: d.destination,
        commodity: d.commodity,
        gross_weight: d.gross_weight,
        value: d.value,
        truck: d.truck,
        driver: d.driver,
        status: '🟢 Dispatched',
        fullData: { fields: d.fields }
      }));
      setDocuments(mapped);
      if (mapped.length > 0 && !selectedDoc) setSelectedDoc(mapped[0]);
      computeFallbackData(DEFAULT_SAVED_CMRS);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (docId, newStatus) => {
    try {
      const res = await fetch('/api/analytics/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, status: newStatus })
      });
      if (res.ok) {
        if (showToast) showToast('Status updated to ' + newStatus, 'success');
        setDocuments(prev => prev.map(d => (d.id === docId || d.cmr_number === docId) ? { ...d, status: newStatus } : d));
        if (selectedDoc && (selectedDoc.id === docId || selectedDoc.cmr_number === docId)) {
          setSelectedDoc(prev => ({ ...prev, status: newStatus }));
        }
        const ovRes = await fetch('/api/analytics/overview');
        if (ovRes.ok) setOverview(await ovRes.json());
      }
    } catch (e) {
      setDocuments(prev => prev.map(d => (d.id === docId || d.cmr_number === docId) ? { ...d, status: newStatus } : d));
      if (selectedDoc && (selectedDoc.id === docId || selectedDoc.cmr_number === docId)) {
        setSelectedDoc(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  const handleOpenInPad = (doc, padNum) => {
    if (!doc) return;
    if (doc.fullData && doc.fullData.fields) {
      setFields(doc.fullData.fields);
    }
    setActivePad(padNum);
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchQuery =
        !searchQuery ||
        (d.cmr_number + ' ' + d.consignor + ' ' + d.consignee + ' ' + d.driver + ' ' + d.truck + ' ' + d.commodity + ' ' + d.destination)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'DISPATCHED' && (d.status.includes('Dispatched') || d.status.includes('🟢'))) ||
        (statusFilter === 'TRANSIT' && (d.status.includes('Transit') || d.status.includes('🟡'))) ||
        (statusFilter === 'DELIVERED' && (d.status.includes('Delivered') || d.status.includes('🔵'))) ||
        (statusFilter === 'HOLD' && (d.status.includes('Hold') || d.status.includes('🔴')));

      return matchQuery && matchStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const pagedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const timelineChartOption = useMemo(() => {
    if (!timeseries || !timeseries.dates) return {};
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 12 }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: timeseries.dates.map(d => d.substring(5)),
        axisLine: { lineStyle: { color: isDark ? '#475569' : '#cbd5e1' } },
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Shipments',
          nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } },
          axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }
        },
        {
          type: 'value',
          name: 'USD ($k)',
          nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
          splitLine: { show: false },
          axisLabel: {
            formatter: (v) => '$' + (v / 1000).toFixed(0) + 'k',
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: 11
          }
        }
      ],
      series: [
        {
          name: 'Shipments Volume',
          type: 'bar',
          data: timeseries.shipments,
          itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 24
        },
        {
          name: 'Declared Cargo Value ($)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: timeseries.values_usd,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
              ]
            }
          }
        }
      ]
    };
  }, [timeseries, isDark]);

  const destinationDonutOption = useMemo(() => {
    if (!routesData || !routesData.countries) return {};
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} shipments ({d}%)',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        textStyle: { color: isDark ? '#f8fafc' : '#0f172a' }
      },
      legend: {
        bottom: '0%',
        left: 'center',
        textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }
      },
      color: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
      series: [
        {
          name: 'Destination Corridors',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? '#131b2e' : '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold' }
          },
          data: routesData.countries
        }
      ]
    };
  }, [routesData, isDark]);

  const commoditiesBarOption = useMemo(() => {
    if (!commodities || commodities.length === 0) return {};
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
        formatter: (params) => {
          const item = commodities[params[0].dataIndex];
          return '<b>' + item.name + '</b><br/>Weight: ' + item.weight_kg.toLocaleString() + ' KG<br/>Declared Value: $' + item.value_usd.toLocaleString() + ' USD<br/>Total CMRs: ' + item.value;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '5%', top: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Tons',
        axisLabel: { formatter: (v) => (v / 1000).toFixed(0) + 'T', color: isDark ? '#94a3b8' : '#64748b' },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } }
      },
      yAxis: {
        type: 'category',
        data: commodities.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name),
        axisLine: { lineStyle: { color: isDark ? '#475569' : '#cbd5e1' } },
        axisLabel: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 11 }
      },
      series: [
        {
          name: 'Gross Weight (KG)',
          type: 'bar',
          data: commodities.map(c => c.weight_kg),
          itemStyle: {
            color: (params) => {
              const colors = ['#10b981', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899'];
              return colors[params.dataIndex % colors.length];
            },
            borderRadius: [0, 4, 4, 0]
          },
          barMaxWidth: 20
        }
      ]
    };
  }, [commodities, isDark]);

  return (
    <div className='analytics-workspace'>
      <div className='analytics-container'>
        {/* TOP HEADER */}
        <div className='an-header-card'>
          <div>
            <div className='an-brand-row'>
              <span className='an-live-dot'></span>
              <h1 className='an-title'>Sky Ariana Logistics Intelligence</h1>
            </div>
            <p className='an-subtitle'>
              Real-time cross-border waybill analytics, customs routes & freight operations
            </p>
          </div>

          <div className='an-header-actions'>
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className='an-btn an-btn-secondary'
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>

            <button
              onClick={() => setIsAiOpen(true)}
              className='an-btn an-btn-ai'
            >
              <Sparkles size={15} />
              <span>AI Data Assistant</span>
            </button>
          </div>
        </div>

        {/* 4 KPI EXECUTIVE CARDS */}
        <div className='an-kpi-grid'>
          {/* Card 1: Total CMR Waybills */}
          <div className='an-kpi-card'>
            <div className='an-kpi-header'>
              <span className='an-kpi-label'>Total CMR Waybills</span>
              <div className='an-kpi-icon-wrap an-icon-blue'>
                <FileText size={18} />
              </div>
            </div>
            <div className='an-kpi-value-row'>
              <span className='an-kpi-val'>
                {overview ? overview.total_shipments : '--'}
              </span>
              <span className='an-kpi-pill an-pill-success'>
                <TrendingUp size={11} /> +100% Active
              </span>
            </div>
            <div className='an-kpi-sub'>
              <span>Dispatched: <b>{overview ? overview.active_dispatched : 0}</b></span>
              <span>•</span>
              <span>Delivered: <b>{overview ? overview.delivered : 0}</b></span>
            </div>
          </div>

          {/* Card 2: Declared Value */}
          <div className='an-kpi-card'>
            <div className='an-kpi-header'>
              <span className='an-kpi-label'>Declared Cargo Value</span>
              <div className='an-kpi-icon-wrap an-icon-green'>
                <DollarSign size={18} />
              </div>
            </div>
            <div className='an-kpi-value-row'>
              <span className='an-kpi-val'>
                {overview ? '$' + (overview.total_declared_value_usd / 1000).toFixed(1) + 'k' : '--'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--an-text-muted)' }}>USD</span>
            </div>
            <div className='an-kpi-sub'>
              <span>Avg/Consignment: <b>${overview && overview.avg_shipment_value_usd ? overview.avg_shipment_value_usd.toLocaleString() : 0}</b></span>
            </div>
          </div>

          {/* Card 3: Freight Weight */}
          <div className='an-kpi-card'>
            <div className='an-kpi-header'>
              <span className='an-kpi-label'>Gross Freight Weight</span>
              <div className='an-kpi-icon-wrap an-icon-amber'>
                <Package size={18} />
              </div>
            </div>
            <div className='an-kpi-value-row'>
              <span className='an-kpi-val'>
                {overview ? overview.total_gross_weight_tons : '--'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--an-text-muted)' }}>Tons</span>
            </div>
            <div className='an-kpi-sub font-mono'>
              <span>{overview && overview.total_gross_weight_kg ? overview.total_gross_weight_kg.toLocaleString() : 0} KG Total</span>
            </div>
          </div>

          {/* Card 4: Fleet & Network */}
          <div className='an-kpi-card'>
            <div className='an-kpi-header'>
              <span className='an-kpi-label'>Fleet & Trade Network</span>
              <div className='an-kpi-icon-wrap an-icon-purple'>
                <Truck size={18} />
              </div>
            </div>
            <div className='an-kpi-value-row font-mono' style={{ gap: '14px' }}>
              <div>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--an-text-main)' }}>
                  {overview && overview.fleet ? overview.fleet.unique_trucks : 0}
                </span>
                <span style={{ display: 'block', fontSize: '9px', color: 'var(--an-text-muted)', textTransform: 'uppercase' }}>Trucks</span>
              </div>
              <div style={{ borderLeft: '1px solid var(--an-card-border)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--an-text-main)' }}>
                  {overview && overview.fleet ? overview.fleet.unique_drivers : 0}
                </span>
                <span style={{ display: 'block', fontSize: '9px', color: 'var(--an-text-muted)', textTransform: 'uppercase' }}>Drivers</span>
              </div>
              <div style={{ borderLeft: '1px solid var(--an-card-border)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--an-text-main)' }}>
                  {overview && overview.fleet ? overview.fleet.unique_consignees : 0}
                </span>
                <span style={{ display: 'block', fontSize: '9px', color: 'var(--an-text-muted)', textTransform: 'uppercase' }}>Buyers</span>
              </div>
            </div>
            <div className='an-kpi-sub'>
              <span>Active across 4 international corridors</span>
            </div>
          </div>
        </div>

        {/* CHARTS GRID (2 COLUMNS) */}
        <div className='an-charts-grid'>
          {/* Chart 1: Timeline Volume */}
          <div className='an-chart-card'>
            <div className='an-chart-card-header'>
              <div>
                <h3 className='an-card-title'>Transit Volume & Cargo Value Movement</h3>
                <p className='an-card-desc'>Chronological progression of dispatches and declared valuations</p>
              </div>
              <span className='an-status-tag' style={{ fontSize: '10px' }}>Daily Aggregate</span>
            </div>
            <div className='an-chart-box'>
              {timeseries ? (
                <ReactECharts option={timelineChartOption} style={{ height: '100%', width: '100%' }} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--an-text-muted)' }}>Loading chart...</div>
              )}
            </div>
          </div>

          {/* Chart 2: Corridors Donut */}
          <div className='an-chart-card'>
            <div className='an-chart-card-header'>
              <div>
                <h3 className='an-card-title'>Destination Corridors</h3>
                <p className='an-card-desc'>Share of shipments by destination country</p>
              </div>
            </div>
            <div className='an-chart-box'>
              {routesData ? (
                <ReactECharts option={destinationDonutOption} style={{ height: '100%', width: '100%' }} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--an-text-muted)' }}>Loading chart...</div>
              )}
            </div>
          </div>
        </div>

        {/* Commodity Distribution Card */}
        <div className='an-chart-card'>
          <div className='an-chart-card-header'>
            <div>
              <h3 className='an-card-title'>Commodity Classification & Gross Freight Volume</h3>
              <p className='an-card-desc'>Gross weight tonnage transported per commodity category</p>
            </div>
          </div>
          <div className='an-chart-box-sm'>
            {commodities.length > 0 ? (
              <ReactECharts option={commoditiesBarOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--an-text-muted)' }}>Loading commodities...</div>
            )}
          </div>
        </div>

        {/* OPERATIONS GRID & SIDE PANEL */}
        <div className='an-ops-split'>
          {/* Table Column */}
          <div className='an-table-col'>
            <div className='an-table-card'>
              {/* Toolbar */}
              <div className='an-table-toolbar'>
                <div className='an-search-wrap'>
                  <Search size={14} className='an-search-icon' />
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Search CMR #, Exporter, Consignee, Truck, Plate...'
                    className='an-search-input'
                  />
                </div>

                <div className='an-filter-pills'>
                  {['ALL', 'DISPATCHED', 'TRANSIT', 'DELIVERED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={'an-filter-btn ' + (statusFilter === st ? 'active' : '')}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--an-text-muted)' }}>
                  {filteredDocs.length} Waybills
                </div>
              </div>

              {/* Table */}
              <div className='an-table-wrap'>
                <table className='an-table'>
                  <thead>
                    <tr>
                      <th>CMR #</th>
                      <th>Consignor / Exporter</th>
                      <th>Consignee / Destination</th>
                      <th>Commodity</th>
                      <th>Weight & Value</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDocs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--an-text-muted)' }}>
                          No waybill documents match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      pagedDocs.map((doc) => {
                        const isSelected = selectedDoc && (selectedDoc.id === doc.id || selectedDoc.cmr_number === doc.cmr_number);
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDoc(doc)}
                            className={isSelected ? 'selected' : ''}
                          >
                            <td className='an-cmr-badge'>{doc.cmr_number}</td>
                            <td style={{ fontWeight: '600' }}>
                              {doc.consignor ? doc.consignor.split('\n')[0] : 'Unknown'}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>
                                {doc.consignee ? doc.consignee.split('\n')[0] : 'Unknown'}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--an-text-muted)' }}>
                                {doc.destination ? doc.destination.split('\n')[0] : ''}
                              </div>
                            </td>
                            <td style={{ color: 'var(--an-text-muted)' }}>
                              {doc.commodity ? doc.commodity.split('\n')[0] : 'General Cargo'}
                            </td>
                            <td>
                              <div className='an-val-bold'>{doc.value || '$0 USD'}</div>
                              <div style={{ fontSize: '10px', color: 'var(--an-text-muted)' }}>
                                {doc.gross_weight || '0 KG'}
                              </div>
                            </td>
                            <td>
                              <span className='an-status-tag'>{doc.status || '🟢 Dispatched'}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInPad(doc, 2);
                                }}
                                className='an-btn an-btn-secondary'
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                title='Open in CMR Pad 2'
                              >
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className='an-pagination'>
                <span>Page {currentPage} of {totalPages}</span>
                <div className='an-page-btns'>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className='an-page-btn'>
                    <ChevronsLeft size={13} />
                  </button>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className='an-page-btn'>
                    <ChevronLeft size={13} />
                  </button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className='an-page-btn'>
                    <ChevronRight size={13} />
                  </button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className='an-page-btn'>
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel Column */}
          {selectedDoc && (
            <div className='an-panel-col'>
              <div className='an-panel-card'>
                <div className='an-panel-header'>
                  <div>
                    <span className='an-panel-tag'>Waybill Investigation</span>
                    <h3 className='an-panel-cmr'>{selectedDoc.cmr_number}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--an-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Status Switcher */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--an-text-muted)', display: 'block', marginBottom: '6px' }}>
                    Current Status:
                  </span>
                  <div className='an-status-grid'>
                    {[
                      { label: '🟢 Dispatched', val: '🟢 Dispatched' },
                      { label: '🟡 In Transit', val: '🟡 In Transit' },
                      { label: '🔵 Delivered', val: '🔵 Delivered' },
                      { label: '🔴 Customs Hold', val: '🔴 Customs Hold' }
                    ].map(st => (
                      <button
                        key={st.val}
                        onClick={() => handleUpdateStatus(selectedDoc.id, st.val)}
                        className={'an-status-btn ' + (selectedDoc.status === st.val ? 'active' : '')}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail Boxes */}
                <div className='an-detail-box'>
                  <div className='an-detail-label'>Consignor / Shipper (Box 1)</div>
                  <div className='an-detail-val'>{selectedDoc.consignor || 'N/A'}</div>
                </div>

                <div className='an-detail-box'>
                  <div className='an-detail-label'>Consignee / Importer (Box 2)</div>
                  <div className='an-detail-val'>{selectedDoc.consignee || 'N/A'}</div>
                </div>

                <div className='an-detail-2col'>
                  <div className='an-detail-box'>
                    <div className='an-detail-label'>Truck Plate</div>
                    <div className='an-detail-val font-mono'>{selectedDoc.truck || 'Unassigned'}</div>
                  </div>
                  <div className='an-detail-box'>
                    <div className='an-detail-label'>Driver Name</div>
                    <div className='an-detail-val'>{selectedDoc.driver || 'Standard Driver'}</div>
                  </div>
                </div>

                <div className='an-detail-2col'>
                  <div className='an-detail-box' style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
                    <div className='an-detail-label' style={{ color: '#10b981' }}>Declared Value</div>
                    <div className='an-detail-val font-mono' style={{ color: '#10b981' }}>{selectedDoc.value || '$0 USD'}</div>
                  </div>
                  <div className='an-detail-box' style={{ borderColor: '#2563eb', background: 'rgba(37, 99, 235, 0.08)' }}>
                    <div className='an-detail-label' style={{ color: '#2563eb' }}>Gross Weight</div>
                    <div className='an-detail-val font-mono' style={{ color: '#2563eb' }}>{selectedDoc.gross_weight || '0 KG'}</div>
                  </div>
                </div>

                {/* Load Shortcuts */}
                <button
                  onClick={() => handleOpenInPad(selectedDoc, 2)}
                  className='an-open-pad-btn'
                >
                  <ExternalLink size={14} />
                  <span>Open in CMR-PAD-2 (EN/RU)</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenInPad(selectedDoc, 1)}
                    className='an-btn an-btn-secondary'
                    style={{ justifyContent: 'center', fontSize: '11px' }}
                  >
                    Open in Pad 1 (FA)
                  </button>
                  <button
                    onClick={() => handleOpenInPad(selectedDoc, 3)}
                    className='an-btn an-btn-secondary'
                    style={{ justifyContent: 'center', fontSize: '11px' }}
                  >
                    Auto Commercial Invoice
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Chat Panel */}
      <AiDataChatPanel
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />
    </div>
  );
};
