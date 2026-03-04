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
  const memoriaValores = useRef<Record<string, string>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Llamamos a nuestro propio backend en lugar de proxies públicos que fallan
      const res = await fetch(`/api/mercados`);

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const jsonData = await res.json();
      if (!Array.isArray(jsonData)) throw new Error('Respuesta inválida');

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

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchData, 60000);
    } catch (error) {
      console.error('Fallo en la revisión:', error);
      setStatusMsg("Error de conexión. Reintentando en 10s...");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchData, 10000);
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

  return (
    <div className="min-h-screen bg-[#f4f7f6] p-5 flex flex-col items-center font-sans">
      <div className="text-center mb-6 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">COTIZACIONES versión A.B</h1>
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
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {data.map((item) => {
          const isUp = item['class-variacion']?.includes('up');
          const isDown = item['class-variacion']?.includes('down');
          
          let varClass = "text-gray-500 bg-gray-100";
          if (isUp) varClass = "text-green-700 bg-green-100";
          else if (isDown) varClass = "text-red-700 bg-red-100";

          return (
            <div
              key={item.idLimpio}
              className={`rounded-xl p-5 shadow-sm border-t-4 transition-colors duration-500 ${
                item.huboCambio ? 'bg-[#fff9c4] border-orange-500' : 'bg-white border-[#0056b3]'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">{item.nombre}</span>
                <span className={`text-xs font-bold py-0.5 px-2 rounded ${varClass}`}>
                  {item.variacion || '0,00%'}
                </span>
              </div>
              <div className="text-3xl font-extrabold my-2 text-gray-900">
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
