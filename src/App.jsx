import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Sparkles,
  Calendar,
  Shield,
  Fuel,
  Users,
  Settings,
  Search,
  Filter,
  MapPin,
  Navigation,
  CheckCircle2,
  X,
  MessageSquare,
  Send,
  ChevronRight,
  Star,
  Zap,
  Briefcase,
  Award,
  Clock,
  CreditCard,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  Compass,
  Info
} from 'lucide-react';

// ============================================================================
// CONFIGURAÇÃO DA API GEMINI E UTILITÁRIOS
// ============================================================================
const apiKey = ""; // Fornecido automaticamente pelo ambiente em tempo de execução

/**
 * Realiza chamadas à API Gemini (gemini-3-flash-preview) com Exponential Backoff
 * para lidar com possíveis limites de taxa sem poluir o console.
 */
async function callGeminiAPI({ prompt, systemInstruction, responseSchema = null }) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(systemInstruction && {
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }),
    ...(responseSchema && {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    })
  };

  const maxRetries = 4;
  let delay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Resposta vazia da IA");

      return responseSchema ? JSON.parse(text) : text;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// ============================================================================
// DADOS DA FROTA AUTOVANGUARD AI
// ============================================================================
const FLEET_DATA = [
  {
    id: 'porsche-taycan',
    name: 'Porsche Taycan Turbo S',
    category: 'Elétricos',
    tagline: 'Performance elétrica pura e engenharia alemã',
    dailyRate: 1890,
    passengers: 4,
    luggage: '407 L',
    transmission: 'Automática 2 Vel.',
    fuel: '100% Elétrico (480 km)',
    consumptionKmPerUnit: 5.2, // km por kWh
    energyType: 'electric',
    power: '761 cv',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=1000&q=80',
    features: ['Piloto Automático Adaptativo', 'Som Bose Surround', 'Carregamento Ultra-Rápido 800V', 'Interior em Couro Club']
  },
  {
    id: 'bmw-x5-hybrid',
    name: 'BMW X5 xDrive50e M Sport',
    category: 'SUVs',
    tagline: 'Versatilidade executiva e espaço para toda a família',
    dailyRate: 1150,
    passengers: 5,
    luggage: '650 L',
    transmission: 'Automática 8 Vel.',
    fuel: 'Híbrido Plug-in',
    consumptionKmPerUnit: 13.5, // km/L equivalente
    energyType: 'hybrid',
    power: '489 cv',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&w=1000&q=80',
    features: ['Tração Integral xDrive', 'Teto Solar Panorâmico Sky Lounge', 'Porta-malas Amplo', 'Suspensão a Ar Adaptativa']
  },
  {
    id: 'mercedes-s500',
    name: 'Mercedes-Benz S 500 L',
    category: 'Sedans Executivos',
    tagline: 'O padrão ouro em conforto executivo e presença',
    dailyRate: 1450,
    passengers: 5,
    luggage: '550 L',
    transmission: '9G-TRONIC',
    fuel: 'Gasolina / Mild-Hybrid',
    consumptionKmPerUnit: 9.8,
    energyType: 'gasoline',
    power: '435 cv',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
    features: ['Bancos Traseiros Executivos com Massagem', 'Som Burmester 4D', 'Isolamento Acústico Duplo', 'Direção no Eixo Traseiro']
  },
  {
    id: 'audi-rs6',
    name: 'Audi RS6 Avant Performance',
    category: 'Esportivos',
    tagline: 'Superesportivo disfarçado de station wagon familiar',
    dailyRate: 1790,
    passengers: 5,
    luggage: '565 L',
    transmission: 'Tiptronic 8 Vel.',
    fuel: 'Gasolina V8 Biturbo',
    consumptionKmPerUnit: 7.4,
    energyType: 'gasoline',
    power: '630 cv',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
    features: ['Tração Quattro Esportiva', 'Freios em Cerâmica', 'Escape Esportivo RS', 'Head-Up Display']
  },
  {
    id: 'volvo-xc90',
    name: 'Volvo XC90 Ultimate Dark',
    category: 'SUVs',
    tagline: 'Segurança escandinava e 7 lugares com sofisticação',
    dailyRate: 920,
    passengers: 7,
    luggage: '680 L',
    transmission: 'Automática 8 Vel.',
    fuel: 'Híbrido Plug-in',
    consumptionKmPerUnit: 14.0,
    energyType: 'hybrid',
    power: '462 cv',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1000&q=80',
    features: ['7 Lugares Reais', 'Sistema de Som Bowers & Wilkins', 'Pilot Assist Semiautônomo', 'Purificador de Ar Avançado']
  },
  {
    id: 'byd-seal',
    name: 'BYD Seal AWD Performance',
    category: 'Elétricos',
    tagline: 'Tecnologia de ponta, agilidade urbana e zero emissões',
    dailyRate: 590,
    passengers: 5,
    luggage: '400 L',
    transmission: 'Automática Direta',
    fuel: '100% Elétrico (520 km)',
    consumptionKmPerUnit: 6.1,
    energyType: 'electric',
    power: '531 cv',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1000&q=80',
    features: ['Bateria Blade Ultra-Segura', 'Tela Giratória 15.6"', '0 a 100 km/h em 3.8s', 'Câmera 360° HD']
  },
  {
    id: 'bmw-320i',
    name: 'BMW 320i M Sport',
    category: 'Sedans Executivos',
    tagline: 'Dinâmica de condução impecável para negócios e lazer',
    dailyRate: 640,
    passengers: 5,
    luggage: '480 L',
    transmission: 'Steptronic 8 Vel.',
    fuel: 'Flex / Gasolina',
    consumptionKmPerUnit: 11.8,
    energyType: 'gasoline',
    power: '184 cv',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80',
    features: ['BMW Live Cockpit Curved', 'Apple CarPlay & Android Auto Sem Fio', 'Assistente de Estacionamento', 'Pacote Aerodinâmico M']
  },
  {
    id: 'vw-nivus-highline',
    name: 'VW Nivus Highline TSI',
    category: 'Econômicos',
    tagline: 'Eficiência inteligente e conectividade para o dia a dia',
    dailyRate: 280,
    passengers: 5,
    luggage: '415 L',
    transmission: 'Automática 6 Vel.',
    fuel: 'Flex (13.2 km/L)',
    consumptionKmPerUnit: 13.2,
    energyType: 'gasoline',
    power: '128 cv',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=80',
    features: ['VW Play 10.1"', 'ACC (Controle de Cruzeiro Adaptativo)', 'Frenagem Autônoma de Emergência', 'Excelente Economia']
  }
];

const CATEGORIES = ['Todos', 'SUVs', 'Sedans Executivos', 'Elétricos', 'Esportivos', 'Econômicos'];

const INSURANCE_PLANS = [
  {
    id: 'basic',
    name: 'Proteção Essencial',
    dailyPrice: 0,
    description: 'Cobertura básica contra roubo, furto e colisão com franquia padrão.',
    badge: 'Incluso'
  },
  {
    id: 'premium',
    name: 'Proteção Vanguard Plus',
    dailyPrice: 95,
    description: 'Redução de 70% na franquia, proteção para vidros, pneus e assistência 24h VIP.',
    badge: 'Mais Escolhido'
  },
  {
    id: 'vip',
    name: 'Cobertura Total Zero Franquia',
    dailyPrice: 180,
    description: 'Isenção total de franquia, carro reserva imediato em qualquer lugar do Brasil e motorista substituto.',
    badge: 'Blindagem Total'
  }
];

// Formatação de moeda em Real Brasileiro
const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// ============================================================================
// COMPONENTE PRINCIPAL: APP
// ============================================================================
export default function App() {
  // Navegação principal
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'fleet' | 'ai-consultant' | 'simulator' | 'reservations'

  // Filtros da Frota
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Reserva & Detalhes
  const [selectedCar, setSelectedCar] = useState(null);
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [pickupLocation, setPickupLocation] = useState('Aeroporto de Congonhas (CGH) - Lounge VIP');
  const [selectedInsurance, setSelectedInsurance] = useState('premium');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Minhas Reservas (persistência em localStorage)
  const [reservations, setReservations] = useState(() => {
    try {
      const saved = localStorage.getItem('autovanguard_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('autovanguard_reservations', JSON.stringify(reservations));
    } catch (e) {
      // Ignora erro de quota
    }
  }, [reservations]);

  // Estado do Consultor IA (Seção Dedicada)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState(null);

  // Estado do Simulador de Roteiro com IA
  const [simOrigin, setSimOrigin] = useState('São Paulo, SP');
  const [simDestination, setSimDestination] = useState('Campos do Jordão, SP');
  const [simDays, setSimDays] = useState(4);
  const [simCarId, setSimCarId] = useState('bmw-x5-hybrid');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState('');

  // Estado do Chat Flutuante IA
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Olá! Sou o Concierge Virtual da AutoVanguard AI. Como posso ajudar você a escolher o veículo perfeito ou planejar sua próxima viagem hoje?'
    }
  ]);

  // Notificação Toast customizada (substituindo alert)
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtragem de veículos
  const filteredFleet = useMemo(() => {
    return FLEET_DATA.filter((car) => {
      const matchesCat = selectedCategory === 'Todos' || car.category === selectedCategory;
      const matchesPrice = car.dailyRate <= maxPrice;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        car.name.toLowerCase().includes(q) ||
        car.category.toLowerCase().includes(q) ||
        car.tagline.toLowerCase().includes(q) ||
        car.features.some((f) => f.toLowerCase().includes(q));
      return matchesCat && matchesPrice && matchesSearch;
    });
  }, [selectedCategory, maxPrice, searchQuery]);

  // Cálculo de dias de reserva no modal
  const rentalDays = useMemo(() => {
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }, [pickupDate, returnDate]);

  // Cálculo total da reserva
  const bookingSummary = useMemo(() => {
    if (!selectedCar) return { carTotal: 0, insuranceTotal: 0, serviceFee: 0, grandTotal: 0 };
    const insuranceObj = INSURANCE_PLANS.find((p) => p.id === selectedInsurance) || INSURANCE_PLANS[0];
    const carTotal = selectedCar.dailyRate * rentalDays;
    const insuranceTotal = insuranceObj.dailyPrice * rentalDays;
    const serviceFee = Math.round(carTotal * 0.05); // 5% taxa concierge/higienização premium
    return {
      carTotal,
      insuranceTotal,
      serviceFee,
      grandTotal: carTotal + insuranceTotal + serviceFee,
      insuranceName: insuranceObj.name
    };
  }, [selectedCar, rentalDays, selectedInsurance]);

  // Abrir modal de reserva
  const openBookingModal = (car) => {
    setSelectedCar(car);
    setBookingSuccess(false);
  };

  // Confirmar reserva
  const handleConfirmBooking = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      showToast('Por favor, preencha seu nome e e-mail para confirmar a reserva.', 'error');
      return;
    }

    const newReservation = {
      id: `AV-${Math.floor(100000 + Math.random() * 900000)}`,
      car: selectedCar,
      pickupDate,
      returnDate,
      pickupLocation,
      days: rentalDays,
      insurance: bookingSummary.insuranceName,
      total: bookingSummary.grandTotal,
      customerName,
      customerEmail,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    setReservations((prev) => [newReservation, ...prev]);
    setBookingSuccess(true);
    showToast(`Reserva ${newReservation.id} confirmada com sucesso!`);
  };

  // Cancelar reserva
  const handleCancelReservation = (id) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    showToast('Reserva cancelada com sucesso.', 'info');
  };

  // ============================================================================
  // INTEGRAÇÃO IA 1: CONSULTOR DE VEÍCULOS ("ENCONTRE SEU CARRO IDEAL")
  // ============================================================================
  const handleRunAIConsultant = async (customPromptText = null) => {
    const queryToUse = customPromptText || aiPrompt;
    if (!queryToUse.trim()) {
      setAiError('Por favor, descreva sua viagem ou necessidade para que a IA possa analisar.');
      return;
    }

    if (customPromptText) setAiPrompt(customPromptText);
    setAiLoading(true);
    setAiError('');
    setAiRecommendations(null);

    const fleetContext = FLEET_DATA.map((c) => ({
      id: c.id,
      nome: c.name,
      categoria: c.category,
      diaria_BRL: c.dailyRate,
      passageiros: c.passengers,
      porta_malas: c.luggage,
      combustivel: c.fuel,
      potencia: c.power,
      destaques: c.features.join(', ')
    }));

    const systemInstruction = `Você é o Consultor Especialista de Mobilidade de Luxo da AutoVanguard AI no Brasil.
Sua missão é analisar a solicitação do cliente em linguagem natural e recomendar de 1 a 3 veículos EXATOS do nosso catálogo abaixo que melhor atendam às suas necessidades (passageiros, bagagem, tipo de trajeto, conforto, economia ou status).
Catálogo disponível: ${JSON.stringify(fleetContext)}
Responda sempre em Português do Brasil com tom consultivo, sofisticado e objetivo.`;

    const schema = {
      type: "OBJECT",
      properties: {
        consultantSummary: {
          type: "STRING",
          description: "Resumo executivo da análise feita pela IA sobre o perfil da viagem do cliente."
        },
        recommendations: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              carId: {
                type: "STRING",
                description: "O 'id' exato do veículo do catálogo."
              },
              matchScore: {
                type: "INTEGER",
                description: "Porcentagem de compatibilidade de 85 a 100."
              },
              badge: {
                type: "STRING",
                description: "Selo curto como 'Melhor Escolha Geral', 'Máximo Conforto' ou 'Melhor Custo-Benefício'."
              },
              justification: {
                type: "STRING",
                description: "Justificativa personalizada explicando por que este carro é ideal para o cenário descrito."
              }
            },
            required: ["carId", "matchScore", "badge", "justification"]
          }
        }
      },
      required: ["consultantSummary", "recommendations"]
    };

    try {
      const result = await callGeminiAPI({
        prompt: `Necessidade do cliente: "${queryToUse}"`,
        systemInstruction,
        responseSchema: schema
      });

      // Hidratar recomendações com os objetos reais do catálogo
      const enrichedRecs = (result.recommendations || [])
        .map((rec) => {
          const carObj = FLEET_DATA.find((c) => c.id === rec.carId);
          return carObj ? { ...rec, car: carObj } : null;
        })
        .filter(Boolean);

      if (enrichedRecs.length === 0) {
        // Fallback caso a IA retorne ID inesperado
        enrichedRecs.push({
          car: FLEET_DATA[1],
          matchScore: 94,
          badge: 'Recomendação Vanguard',
          justification: 'Versatilidade superior, conforto executivo e excelente capacidade para sua jornada.'
        });
      }

      setAiRecommendations({
        summary: result.consultantSummary,
        items: enrichedRecs
      });
    } catch (err) {
      setAiError('Não foi possível conectar ao Consultor IA no momento. Tente novamente em instantes.');
    } finally {
      setAiLoading(false);
    }
  };

  // ============================================================================
  // INTEGRAÇÃO IA 2: SIMULADOR DE ROTEIRO E CUSTOS COM IA
  // ============================================================================
  const handleSimulateRoute = async (e) => {
    e.preventDefault();
    if (!simOrigin.trim() || !simDestination.trim()) {
      setSimError('Informe a cidade de origem e o destino.');
      return;
    }

    const selectedVehicle = FLEET_DATA.find((c) => c.id === simCarId) || FLEET_DATA[0];
    setSimLoading(true);
    setSimError('');
    setSimResult(null);

    const systemInstruction = `Você é um Especialista em Logística, Rotas Rodoviárias e Mobilidade Elétrica/Executiva no Brasil da AutoVanguard AI.
Calcule de forma realista a distância aproximada de ida e volta entre origem e destino no Brasil, estime os custos de combustível (considerando gasolina média R$ 6,15/L) ou recarga elétrica (considerando eletropostos rápidos a R$ 2,10/kWh) para o veículo escolhido, dê dicas práticas da estrada/roteiro e recomende o melhor pacote de seguro da AutoVanguard (Proteção Essencial, Proteção Vanguard Plus ou Cobertura Total Zero Franquia).`;

    const schema = {
      type: "OBJECT",
      properties: {
        estimatedRoundTripKm: {
          type: "INTEGER",
          description: "Distância estimada total (ida e volta + deslocamentos locais) em km."
        },
        estimatedEnergyCostBRL: {
          type: "NUMBER",
          description: "Custo estimado total com combustível ou recarga elétrica em Reais."
        },
        estimatedTollsBRL: {
          type: "NUMBER",
          description: "Estimativa aproximada de pedágios no trajeto em Reais."
        },
        routeHighlights: {
          type: "STRING",
          description: "Resumo das condições das rodovias, tempo médio de viagem e pontos de atenção."
        },
        chargingOrFuelTips: {
          type: "STRING",
          description: "Dicas específicas de abastecimento ou pontos de recarga rápida no trajeto."
        },
        recommendedInsurance: {
          type: "STRING",
          description: "Nome do plano de seguro recomendado e por quê."
        },
        conciergeTips: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "3 dicas exclusivas para aproveitar melhor a viagem."
        }
      },
      required: [
        "estimatedRoundTripKm",
        "estimatedEnergyCostBRL",
        "estimatedTollsBRL",
        "routeHighlights",
        "chargingOrFuelTips",
        "recommendedInsurance",
        "conciergeTips"
      ]
    };

    try {
      const prompt = `Simular viagem:
Origem: ${simOrigin}
Destino: ${simDestination}
Duração: ${simDays} dias
Veículo selecionado: ${selectedVehicle.name} (${selectedVehicle.fuel}, consumo médio de ${selectedVehicle.consumptionKmPerUnit} km por unidade de energia, potência ${selectedVehicle.power}).`;

      const data = await callGeminiAPI({
        prompt,
        systemInstruction,
        responseSchema: schema
      });

      setSimResult({
        ...data,
        vehicle: selectedVehicle,
        days: simDays,
        rentalEstimate: selectedVehicle.dailyRate * simDays
      });
    } catch (err) {
      setSimError('Falha ao calcular roteiro com IA. Verifique sua conexão e tente novamente.');
    } finally {
      setSimLoading(false);
    }
  };

  // ============================================================================
  // INTEGRAÇÃO IA 3: CHAT FLUTUANTE CONCIERGE
  // ============================================================================
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    const fleetSummary = FLEET_DATA.map(
      (c) => `- ${c.name} (${c.category}): R$ ${c.dailyRate}/dia, ${c.passengers} lug., ${c.fuel}`
    ).join('\n');

    const systemInstruction = `Você é o Concierge Virtual da AutoVanguard AI, uma locadora de veículos de luxo, elétricos e executivos no Brasil.
Seja cordial, direto, elegante e prestativo. Responda em português do Brasil (máximo de 3 parágrafos curtos).
Nossa frota atual e preços de diária:
${fleetSummary}
Seguros: Essencial (Incluso), Vanguard Plus (R$ 95/dia), Cobertura Total Zero Franquia (R$ 180/dia).
Se o cliente quiser reservar, oriente-o a clicar em "Reservar" no catálogo ou usar nossa aba "Consultor IA".`;

    try {
      const historyPrompt = chatMessages
        .slice(-4)
        .map((m) => `${m.role === 'user' ? 'Cliente' : 'Concierge'}: ${m.text}`)
        .join('\n');

      const reply = await callGeminiAPI({
        prompt: `${historyPrompt}\nCliente: ${userMsg}\nConcierge:`,
        systemInstruction
      });

      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Desculpe, tive uma instabilidade momentânea. Posso ajudar você através do nosso Consultor IA na página principal!'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO DE SUB-COMPONENTES DE INTERFACE
  // ============================================================================

  const renderVehicleCard = (car, aiBadge = null, aiJustification = null) => (
    <div
      key={car.id}
      className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-400/50 transition-all duration-300 flex flex-col"
    >
      {/* Imagem e Badges */}
      <div className="relative h-56 overflow-hidden bg-slate-900">
        <img
          src={car.image}
          alt={car.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-950/80 text-white backdrop-blur-md border border-white/10">
            {car.category}
          </span>
          {aiBadge && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-lg">
              <Sparkles className="w-3 h-3" /> {aiBadge}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/10">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          {car.rating.toFixed(1)}
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end text-white">
          <div>
            <h3 className="text-lg font-bold tracking-tight leading-tight">{car.name}</h3>
            <p className="text-xs text-slate-300 line-clamp-1">{car.tagline}</p>
          </div>
        </div>
      </div>

      {/* Especificações */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {aiJustification && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-slate-800 text-xs leading-relaxed">
              <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Por que a IA escolheu este modelo:
              </div>
              {aiJustification}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-600 mb-4">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
              <Users className="w-4 h-4 text-slate-700 shrink-0" />
              <span>{car.passengers} Passageiros</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
              <Briefcase className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Malas: {car.luggage}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
              <Settings className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="truncate">{car.transmission}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
              {car.energyType === 'electric' ? (
                <Zap className="w-4 h-4 text-sky-600 shrink-0" />
              ) : (
                <Fuel className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="truncate">{car.fuel}</span>
            </div>
          </div>

          {/* Destaques */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {car.features.slice(0, 2).map((feat, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Rodapé Preço + CTA */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">Diária a partir de</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{formatBRL(car.dailyRate)}</span>
              <span className="text-xs text-slate-500">/dia</span>
            </div>
          </div>

          <button
            onClick={() => openBookingModal(car)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-semibold text-sm transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            Reservar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-fade-in">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium ${
              toastMessage.type === 'error'
                ? 'bg-red-950 text-red-100 border-red-800'
                : 'bg-slate-900 text-white border-amber-500/40'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* ======================================================================
          HEADER / NAVBAR
      ====================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3.5">
            {/* Logo */}
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Car className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white">
                    AutoVanguard
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Mobilidade Executiva & Inteligente
                </p>
              </div>
            </button>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'home', label: 'Início' },
                { id: 'fleet', label: 'Frota Exclusiva' },
                { id: 'ai-consultant', label: 'Consultor IA', icon: Sparkles },
                { id: 'simulator', label: 'Simulador de Rota', icon: Compass },
                { id: 'reservations', label: `Minhas Reservas (${reservations.length})` }
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 ${active ? 'text-slate-950' : 'text-amber-400'}`} />}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Botão Ação Rápida */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ai-consultant')}
                className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Carro Ideal IA</span>
                <span className="sm:hidden">IA</span>
              </button>
            </div>
          </div>

          {/* Navegação Mobile */}
          <div className="flex md:hidden overflow-x-auto pb-2.5 gap-1.5 no-scrollbar">
            {[
              { id: 'home', label: 'Início' },
              { id: 'fleet', label: 'Frota' },
              { id: 'ai-consultant', label: 'Consultor IA' },
              { id: 'simulator', label: 'Simulador' },
              { id: 'reservations', label: `Reservas (${reservations.length})` }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === item.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ======================================================================
          CONTEÚDO DINÂMICO POR ABA
      ====================================================================== */}
      <main className="flex-1">
        {/* --------------------------------------------------------------------
            ABA 1: INÍCIO (HERO + CONSULTOR RÁPIDO + DESTAQUES DA FROTA)
        -------------------------------------------------------------------- */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="relative bg-slate-950 text-white overflow-hidden">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80"
                  alt="Porsche luxo estrada"
                  className="w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
              </div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-6">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Primeira Locadora Executiva Guiada por IA no Brasil
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                    Dirija o extraordinário com{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-sky-400">
                      inteligência sob medida.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">
                    De elétricos de alta performance a SUVs blindados e sedans executivos. Descreva sua viagem e nossa IA seleciona o veículo ideal, calcula rotas e personaliza sua experiência.
                  </p>

                  <div className="flex flex-wrap gap-3.5">
                    <button
                      onClick={() => setActiveTab('fleet')}
                      className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      Explorar Frota Completa <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab('ai-consultant')}
                      className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-sky-400" /> Consultor Virtual IA
                    </button>
                  </div>
                </div>

                {/* Widget Rápido "Encontre seu Carro Ideal com IA" */}
                <div className="mt-14 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-bold text-white text-base sm:text-lg">
                          Encontre seu Carro Ideal com IA
                        </h2>
                        <p className="text-xs text-slate-400">
                          Conte sobre sua viagem em linguagem natural e receba recomendações instantâneas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRunAIConsultant()}
                      placeholder="Ex: Vou viajar com 4 pessoas para a serra por 5 dias e preciso de porta-malas grande..."
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleRunAIConsultant()}
                      disabled={aiLoading}
                      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Recomendar Veículo
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sugestões Rápidas */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">Experimente:</span>
                    {[
                      'Carro elétrico moderno para reuniões em São Paulo',
                      'SUV de 7 lugares seguro para viagem em família ao litoral',
                      'Esportivo marcante para fim de semana romântico'
                    ].map((sample, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveTab('ai-consultant');
                          handleRunAIConsultant(sample);
                        }}
                        className="px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
                      >
                        "{sample}"
                      </button>
                    ))}
                  </div>

                  {/* Resultado rápido se gerado na Home */}
                  {aiRecommendations && (
                    <div className="mt-6 pt-6 border-t border-slate-800">
                      <p className="text-sm text-amber-300 font-medium mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> {aiRecommendations.summary}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {aiRecommendations.items.map((rec) =>
                          renderVehicleCard(rec.car, `${rec.matchScore}% Match • ${rec.badge}`, rec.justification)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Pilares de Excelência */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center mb-4">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Frota Impecável 2025/2026</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Veículos revisados rigorosamente antes de cada entrega, com higienização hospitalar e conectividade total ativada.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center mb-4">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Telemetria & Roteiros IA</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Planeje custos de combustível, pontos de recarga ultrarrápida e pedágios antes mesmo de dar a partida.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Entrega VIP & Concierge 24h</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Retire nos principais aeroportos sem filas ou solicite entrega executiva diretamente no seu hotel ou escritório.
                  </p>
                </div>
              </div>
            </section>

            {/* Destaque da Frota */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Seleção Curada
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                    Destaques da Frota AutoVanguard
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('fleet')}
                  className="text-sm font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Ver todos os {FLEET_DATA.length} modelos <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FLEET_DATA.slice(0, 3).map((car) => renderVehicleCard(car))}
              </div>
            </section>
          </div>
        )}

        {/* --------------------------------------------------------------------
            ABA 2: CATÁLOGO COMPLETO DE VEÍCULOS E FILTROS
        -------------------------------------------------------------------- */}
        {activeTab === 'fleet' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900">Nossa Frota Executiva</h1>
              <p className="text-slate-600 mt-1">
                Filtre por categoria, faixa de investimento ou busque por características específicas.
              </p>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Busca por texto */}
                <div className="lg:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar modelo, motor, opcional (ex: Porsche, 7 lugares, Elétrico)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none text-sm"
                  />
                </div>

                {/* Filtro de Faixa de Preço */}
                <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between sm:justify-start gap-2 text-xs font-semibold text-slate-700 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-amber-600" />
                    <span>Diária até:</span>
                    <span className="text-slate-950 font-bold text-sm">{formatBRL(maxPrice)}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="2000"
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Reset Filtros */}
                <div className="lg:col-span-2 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedCategory('Todos');
                      setMaxPrice(2000);
                      setSearchQuery('');
                    }}
                    className="w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Pílulas de Categoria */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-amber-400 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Resultados */}
            {filteredFleet.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Nenhum veículo encontrado</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Tente aumentar o limite de valor da diária ou limpar os termos de busca.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('Todos');
                    setMaxPrice(2000);
                    setSearchQuery('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
                >
                  Mostrar Toda a Frota
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFleet.map((car) => renderVehicleCard(car))}
              </div>
            )}
          </section>
        )}

        {/* --------------------------------------------------------------------
            ABA 3: CONSULTOR VIRTUAL DEDICADO COM IA
        -------------------------------------------------------------------- */}
        {activeTab === 'ai-consultant' && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-slate-800 mb-10">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Inteligência Artificial Gemini Integrada
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                  Encontre seu Carro Ideal com IA
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  Descreva seu itinerário, número de passageiros, quantidade de bagagens ou estilo desejado. Nossa inteligência artificial analisa toda a frota AutoVanguard e justifica as melhores opções para você.
                </p>
              </div>

              <div className="space-y-4">
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Vou viajar com minha família de 4 pessoas para a serra por 5 dias e preciso de porta-malas grande e conforto na estrada..."
                  className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 rounded-2xl p-4 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Família de 4 pessoas para a serra por 5 dias com malas grandes',
                      'Carro elétrico moderno para reuniões executivas em São Paulo',
                      'Veículo econômico e tecnológico para trabalho durante a semana'
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRunAIConsultant(preset)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleRunAIConsultant()}
                    disabled={aiLoading}
                    className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Consultando Frota...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Analisar e Recomendar
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados da Recomendação IA */}
            {aiRecommendations && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-2xl border border-amber-300/80 shadow-sm flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">Parecer do Consultor AutoVanguard AI</h2>
                    <p className="text-slate-600 text-sm sm:text-base mt-1 leading-relaxed">
                      {aiRecommendations.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiRecommendations.items.map((rec) =>
                    renderVehicleCard(
                      rec.car,
                      `${rec.matchScore}% Compatível • ${rec.badge}`,
                      rec.justification
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* --------------------------------------------------------------------
            ABA 4: SIMULADOR DE ROTEIRO E CUSTOS COM IA
        -------------------------------------------------------------------- */}
        {activeTab === 'simulator' && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold mb-2">
                <Compass className="w-3.5 h-3.5" /> Planejamento Inteligente de Viagem
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Simulador de Roteiro e Custos com IA
              </h1>
              <p className="text-slate-600 mt-1">
                Estime gastos com combustível ou recarga elétrica, pedágios e receba recomendações de trajeto e seguro.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Formulário */}
              <form
                onSubmit={handleSimulateRoute}
                className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Cidade de Origem
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={simOrigin}
                      onChange={(e) => setSimOrigin(e.target.value)}
                      placeholder="Ex: São Paulo, SP"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Destino Principal
                  </label>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={simDestination}
                      onChange={(e) => setSimDestination(e.target.value)}
                      placeholder="Ex: Campos do Jordão, SP"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Dias de Viagem
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={simDays}
                      onChange={(e) => setSimDays(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Veículo Base
                    </label>
                    <select
                      value={simCarId}
                      onChange={(e) => setSimCarId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none text-sm bg-white"
                    >
                      {FLEET_DATA.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {simError && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {simError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={simLoading}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {simLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculando Roteiro...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Simular Custos & Trajeto
                    </>
                  )}
                </button>
              </form>

              {/* Painel de Resultados */}
              <div className="lg:col-span-7">
                {!simResult && !simLoading && (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center h-full flex flex-col items-center justify-center">
                    <Compass className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="font-bold text-slate-800 text-lg">Pronto para simular sua rota</h3>
                    <p className="text-sm text-slate-500 max-w-md mt-1">
                      Preencha origem, destino e veículo ao lado para nossa IA projetar distância ida e volta, gastos energéticos, pedágios e dicas exclusivas.
                    </p>
                  </div>
                )}

                {simLoading && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                    <p className="font-bold text-slate-800">Mapeando rodovias e eficiência energética...</p>
                    <p className="text-xs text-slate-500 mt-1">Isso leva apenas alguns segundos.</p>
                  </div>
                )}

                {simResult && !simLoading && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-amber-600 uppercase">
                          Relatório de Viagem IA
                        </span>
                        <h3 className="text-xl font-extrabold text-slate-900">
                          {simOrigin} → {simDestination}
                        </h3>
                      </div>
                      <button
                        onClick={() => openBookingModal(simResult.vehicle)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        Reservar {simResult.vehicle.name} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* KPIs Financeiros */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block">Distância Est.</span>
                        <span className="text-lg font-extrabold text-slate-900">
                          {simResult.estimatedRoundTripKm} km
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block">
                          {simResult.vehicle.energyType === 'electric' ? 'Recarga Elétrica' : 'Combustível'}
                        </span>
                        <span className="text-lg font-extrabold text-sky-700">
                          {formatBRL(simResult.estimatedEnergyCostBRL)}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block">Pedágios Est.</span>
                        <span className="text-lg font-extrabold text-slate-900">
                          {formatBRL(simResult.estimatedTollsBRL)}
                        </span>
                      </div>
                      <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200/70">
                        <span className="text-[11px] text-amber-800 block">Locação ({simResult.days}d)</span>
                        <span className="text-lg font-extrabold text-amber-900">
                          {formatBRL(simResult.rentalEstimate)}
                        </span>
                      </div>
                    </div>

                    {/* Detalhes do Trajeto */}
                    <div className="space-y-3 text-sm">
                      <div className="p-4 rounded-xl bg-slate-900 text-slate-200">
                        <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-amber-400" /> Análise do Trajeto
                        </h4>
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                          {simResult.routeHighlights}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                          <h4 className="font-bold text-sky-950 text-xs uppercase mb-1 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-sky-600" /> Abastecimento / Recarga
                          </h4>
                          <p className="text-xs text-sky-900 leading-relaxed">
                            {simResult.chargingOrFuelTips}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                          <h4 className="font-bold text-emerald-950 text-xs uppercase mb-1 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" /> Seguro Recomendado
                          </h4>
                          <p className="text-xs text-emerald-900 leading-relaxed">
                            {simResult.recommendedInsurance}
                          </p>
                        </div>
                      </div>

                      {/* Dicas Concierge */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                          Dicas Exclusivas Concierge
                        </h4>
                        <ul className="space-y-1.5">
                          {simResult.conciergeTips?.map((tip, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* --------------------------------------------------------------------
            ABA 5: MINHAS RESERVAS
        -------------------------------------------------------------------- */}
        {activeTab === 'reservations' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Minhas Reservas</h1>
                <p className="text-slate-600 mt-1">
                  Gerencie suas locações confirmadas na AutoVanguard AI.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('fleet')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + Nova Reserva
              </button>
            </div>

            {reservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Você ainda não possui reservas</h3>
                <p className="text-sm text-slate-500 mt-1 mb-5">
                  Explore nossa frota executiva ou peça uma recomendação ao nosso Consultor IA.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('fleet')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer"
                  >
                    Ver Catálogo
                  </button>
                  <button
                    onClick={() => setActiveTab('ai-consultant')}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm cursor-pointer"
                  >
                    Usar Consultor IA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((res) => (
                  <div
                    key={res.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                      <img
                        src={res.car.image}
                        alt={res.car.name}
                        className="w-full sm:w-36 h-24 object-cover rounded-xl"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                            Confirmada • {res.id}
                          </span>
                          <span className="text-xs text-slate-400">Emitida em {res.createdAt}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{res.car.name}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <strong>Retirada:</strong> {res.pickupDate} • <strong>Devolução:</strong>{' '}
                          {res.returnDate} ({res.days} {res.days === 1 ? 'diária' : 'diárias'})
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Local: {res.pickupLocation} • Seguro: {res.insurance}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-xs text-slate-400 block">Valor Total</span>
                        <span className="text-xl font-extrabold text-slate-900">
                          {formatBRL(res.total)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        title="Cancelar Reserva"
                        className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ======================================================================
          MODAL DE DETALHES E RESERVA RÁPIDA
      ====================================================================== */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
            {/* Cabeçalho do Modal */}
            <div className="relative h-48 sm:h-56 bg-slate-900">
              <img
                src={selectedCar.image}
                alt={selectedCar.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <button
                onClick={() => setSelectedCar(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 text-xs font-extrabold uppercase">
                  {selectedCar.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{selectedCar.name}</h2>
                <p className="text-xs sm:text-sm text-slate-300">{selectedCar.tagline}</p>
              </div>
            </div>

            {bookingSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Reserva Confirmada com Sucesso!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Preparamos o seu <strong>{selectedCar.name}</strong>. Você pode visualizar ou gerenciar todos os detalhes na aba <strong>Minhas Reservas</strong>.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedCar(null);
                      setActiveTab('reservations');
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer"
                  >
                    Ir para Minhas Reservas
                  </button>
                  <button
                    onClick={() => setSelectedCar(null)}
                    className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm cursor-pointer"
                  >
                    Continuar Navegando
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Especificações Rápidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Potência</span>
                    <strong className="text-slate-900">{selectedCar.power}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Capacidade</span>
                    <strong className="text-slate-900">{selectedCar.passengers} Lugares</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Porta-Malas</span>
                    <strong className="text-slate-900">{selectedCar.luggage}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">Propulsão</span>
                    <strong className="text-slate-900">{selectedCar.fuel}</strong>
                  </div>
                </div>

                {/* Datas e Local */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data de Retirada
                    </label>
                    <input
                      type="date"
                      required
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data de Devolução
                    </label>
                    <input
                      type="date"
                      required
                      value={returnDate}
                      min={pickupDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ponto de Retirada VIP
                    </label>
                    <select
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option>Aeroporto de Congonhas (CGH) - Lounge VIP</option>
                      <option>Aeroporto de Guarulhos (GRU) - Terminal 3</option>
                      <option>Av. Faria Lima - Hub Executivo SP</option>
                      <option>Aeroporto Santos Dumont (SDU) - RJ</option>
                      <option>Entrega Delivery no Endereço do Cliente</option>
                    </select>
                  </div>
                </div>

                {/* Seguro Opcional */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Escolha o Nível de Proteção
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {INSURANCE_PLANS.map((plan) => {
                      const isSelected = selectedInsurance === plan.id;
                      return (
                        <button
                          type="button"
                          key={plan.id}
                          onClick={() => setSelectedInsurance(plan.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                              {plan.badge}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900">
                              {plan.dailyPrice === 0 ? 'Grátis' : `+${formatBRL(plan.dailyPrice)}/dia`}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-slate-900 mt-1">{plan.name}</div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {plan.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dados do Condutor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo do Condutor
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Henrique Vasconcelos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail para Voucher Digital
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="henrique@empresa.com.br"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-slate-950 text-white p-5 rounded-2xl space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>
                      Locação ({rentalDays} {rentalDays === 1 ? 'diária' : 'diárias'} x{' '}
                      {formatBRL(selectedCar.dailyRate)})
                    </span>
                    <span>{formatBRL(bookingSummary.carTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Seguro ({bookingSummary.insuranceName})</span>
                    <span>{formatBRL(bookingSummary.insuranceTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>Taxa Concierge & Higienização Premium (5%)</span>
                    <span>{formatBRL(bookingSummary.serviceFee)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-base">Total Estimado</span>
                    <span className="text-2xl font-extrabold text-amber-400">
                      {formatBRL(bookingSummary.grandTotal)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCar(null)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" /> Confirmar Reserva Agora
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          ASSISTENTE FLUTUANTE COM INTELIGÊNCIA ARTIFICIAL (CONCIERGE CHAT)
      ====================================================================== */}
      <div className="fixed bottom-5 right-5 z-40">
        {chatOpen ? (
          <div className="w-[340px] sm:w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header Chat */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-sky-500 flex items-center justify-center text-slate-950">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">Concierge AutoVanguard AI</h4>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online • Gemini AI
                  </span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Histórico de Mensagens */}
            <div className="p-4 h-80 overflow-y-auto space-y-3 bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    Digitando resposta...
                  </div>
                </div>
              )}
            </div>

            {/* Input Chat */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pergunte sobre carros, preços, seguros..."
                className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-slate-950 hover:bg-slate-900 text-white shadow-2xl border border-amber-500/40 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 fill-slate-950" />
            </div>
            <div className="text-left pr-1">
              <span className="block text-xs font-bold leading-none">Consultor IA</span>
              <span className="text-[10px] text-amber-400">Tire dúvidas agora</span>
            </div>
          </button>
        )}
      </div>

      {/* ======================================================================
          FOOTER
      ====================================================================== */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-white">AutoVanguard AI</span>
            <span className="text-xs text-slate-500">© 2026 • Mobilidade Inteligente</span>
          </div>
          <p className="text-xs text-center sm:text-right">
            Atendimento VIP 24h • São Paulo • Rio de Janeiro • Brasília • Curitiba • Florianópolis
          </p>
        </div>
      </footer>
    </div>
  );
}

