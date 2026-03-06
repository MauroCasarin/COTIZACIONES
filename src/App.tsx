import { useState, useEffect, useRef, useCallback } from 'react';

interface FinancialItem {
  nombre: string;
  compra?: string;
  venta?: string;
  ultimo?: string;
  val1?: string;
  variacion?: string;
  'class-variacion'?: string;
  fecha?: string;
  valorActual?: string;
  idLimpio?: string;
  huboCambio?: boolean;
}

export default function App() {
  const [data, setData] = useState<FinancialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Conectando...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const memoriaValores = useRef<Record<string, string>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const urlAmbito = 'https://mercados.ambito.com/home/general';
      let jsonData;

      // 1. Intentamos primero con nuestro propio backend (solo si no estamos en Vercel/Producción estática)
      // O simplemente intentamos y capturamos el error silenciosamente
      const isVercel = window.location.hostname.includes('vercel.app');
      
      let success = false;
      
      if (!isVercel) {
        try {
          const res = await fetch(`/api/mercados`);
          if (res.ok) {
            jsonData = await res.json();
            success = true;
          }
        } catch (e) {
          console.warn("Backend local no disponible, usando fallback...");
        }
      }

      if (!success) {
        // 2. PLAN B: Proxy Fallback 1 (AllOrigins)
        try {
          const fallbackRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlAmbito)}&timestamp=${Date.now()}`);
          if (fallbackRes.ok) {
            const wrapper = await fallbackRes.json();
            if (wrapper.contents) {
              jsonData = JSON.parse(wrapper.contents);
              success = true;
            }
          }
        } catch (e) {
          console.warn("Fallback 1 falló, intentando Fallback 2...");
        }
      }

      if (!success) {
        // 3. PLAN C: Proxy Fallback 2 (Corsproxy.io)
        const fallbackRes2 = await fetch(`https://corsproxy.io/?${encodeURIComponent(urlAmbito)}`);
        if (fallbackRes2.ok) {
          jsonData = await fallbackRes2.json();
          success = true;
        }
      }

      if (!success || !Array.isArray(jsonData)) throw new Error('No se pudo obtener la información de ninguna fuente');

      const processedData = jsonData
        .filter((item: any) => item.val1 || item.ultimo)
        .map((item: any) => {
          const valorActual = item.venta || item.ultimo || item.val1;
          const idLimpio = item.nombre.replace(/\s+/g, '');

          let huboCambio = false;
          if (memoriaValores.current[idLimpio] && memoriaValores.current[idLimpio] !== valorActual) {
            huboCambio = true;
          }
          memoriaValores.current[idLimpio] = valorActual;

          return { ...item, valorActual, idLimpio, huboCambio };
        });

      setData(processedData);
      setStatusMsg(`Sincronizado • ${new Date().toLocaleTimeString()}`);
      setCountdown(600); // 10 minutos

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchData, 600000);
    } catch (error) {
      console.error('Fallo en la revisión:', error);
      setStatusMsg("Error de conexión. Reintentando en 60s...");
      setCountdown(60); // 60 segundos para reintento

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchData, 60000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] p-5 flex flex-col items-center font-sans">
      <div className="text-center mb-6 w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          COTIZACIONES <span className="text-xs font-normal text-gray-500 ml-1">versión A.B-10</span>
        </h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-[#0056b3] text-white border-none py-3 px-6 rounded-lg text-base font-bold cursor-pointer shadow-md mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'VERIFICANDO...' : 'ACTUALIZAR AHORA'}
        </button>
        <div>
          <span className="text-sm text-gray-600 bg-white py-2 px-5 rounded-full border border-gray-300 inline-block">
            {statusMsg}
            {countdown !== null && countdown > 0 && (
              <span className="ml-2 font-mono text-blue-600 border-l pl-2 border-gray-200">
                Próxima: {formatCountdown(countdown)}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full max-w-6xl">
        {data.map((item) => {
          const isUp = item['class-variacion']?.includes('up');
          const isDown = item['class-variacion']?.includes('down');
          
          let varClass = "text-gray-500 bg-gray-100";
          if (isUp) varClass = "text-green-700 bg-green-100";
          else if (isDown) varClass = "text-red-700 bg-red-100";

          return (
            <div
              key={item.idLimpio}
              className={`rounded-lg p-3 shadow-sm border-t-2 transition-colors duration-500 ${
                item.huboCambio ? 'bg-[#fff9c4] border-orange-500' : 'bg-white border-[#0056b3]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase truncate mr-1">{item.nombre}</span>
                <span className={`text-[10px] font-bold py-0.5 px-1.5 rounded shrink-0 ${varClass}`}>
                  {item.variacion || '0,00%'}
                </span>
              </div>
              <div className="text-xl font-extrabold my-1 text-gray-900 truncate">
                {item.nombre.includes('Dólar') ? '$' + item.valorActual : item.valorActual}
              </div>
              {item.huboCambio && (
                <div className="text-xs font-bold text-yellow-800 mt-2 p-1.5 bg-yellow-100 rounded">
                  ✨ ¡Actualizado! ({new Date().toLocaleTimeString()})
                </div>
              )}
              <div className="text-xs text-gray-400 border-t border-gray-100 pt-2 mt-2">
                Ref: {item.fecha}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
