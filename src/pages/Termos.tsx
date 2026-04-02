import PublicLayout from "@/components/PublicLayout";

export default function Termos() {
  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-black text-white">Termos de Uso</h1>
          <p className="mt-2 text-sm text-gray-500">Última atualização: 01 de Abril de 2026</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-400">
            <div>
              <h2 className="mb-3 text-lg font-bold text-white">1. Aceitação dos Termos</h2>
              <p>Ao acessar e utilizar a plataforma ScalaCOD, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize nossos serviços.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">2. Descrição do Serviço</h2>
              <p>O ScalaCOD é uma plataforma de automação para vendas COD (Cash on Delivery) que oferece checkout inteligente, integração com logísticas, automação de WhatsApp, gerenciamento de pedidos e ferramentas de remarketing.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">3. Cadastro e Conta</h2>
              <p>Para utilizar o ScalaCOD, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável pela segurança de sua senha e por todas as atividades realizadas em sua conta.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">4. Planos e Pagamento</h2>
              <p>Os planos são cobrados mensalmente ou anualmente, conforme escolha do usuário. Todos os planos incluem um período de teste gratuito de 7 dias. O cancelamento pode ser feito a qualquer momento sem multa.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">5. Uso Aceitável</h2>
              <p>Você concorda em não utilizar a plataforma para atividades ilegais, envio de spam, fraudes ou qualquer atividade que viole direitos de terceiros. O ScalaCOD se reserva o direito de suspender contas que violem estes termos.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">6. Propriedade Intelectual</h2>
              <p>Todo o conteúdo, design, código e funcionalidades da plataforma ScalaCOD são de propriedade exclusiva da empresa. É proibida a reprodução, distribuição ou modificação sem autorização prévia.</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-white">7. Limitação de Responsabilidade</h2>
              <p>O ScalaCOD não se responsabiliza por perdas indiretas, lucros cessantes ou danos consequentes decorrentes do uso da plataforma. Nossa responsabilidade máxima é limitada ao valor pago pelo usuário nos últimos 12 meses.</p>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-10">
            <h1 className="text-4xl font-black text-white">Política de Privacidade</h1>
            <p className="mt-2 text-sm text-gray-500">Última atualização: 01 de Abril de 2026</p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-400">
              <div>
                <h2 className="mb-3 text-lg font-bold text-white">1. Dados Coletados</h2>
                <p>Coletamos dados de cadastro (nome, email), dados de uso da plataforma, dados de pedidos e métricas de performance. Dados de pagamento são processados por terceiros (Mercado Pago) e não são armazenados em nossos servidores.</p>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold text-white">2. Uso dos Dados</h2>
                <p>Seus dados são utilizados para: fornecer e melhorar nossos serviços, processar transações, enviar comunicações relevantes e garantir a segurança da plataforma.</p>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold text-white">3. Compartilhamento</h2>
                <p>Não vendemos seus dados. Compartilhamos informações apenas com parceiros necessários para a operação (logísticas, gateway de pagamento) e quando exigido por lei.</p>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold text-white">4. Segurança</h2>
                <p>Utilizamos criptografia, controle de acesso e monitoramento contínuo para proteger seus dados. A comunicação é feita via HTTPS e os dados são armazenados em servidores seguros.</p>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold text-white">5. Seus Direitos</h2>
                <p>Conforme a LGPD, você tem direito a: acessar, corrigir, excluir seus dados, solicitar portabilidade e revogar consentimento. Para exercer seus direitos, entre em contato via contato@scalacod.com.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
