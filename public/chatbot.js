// public/chatbot.js
document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatbotPanel = document.getElementById('chatbotPanel');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotInput = document.getElementById('chatbotInput');
    const sendMessageBtn = document.getElementById('sendMessage');
    
    // API Configuration - GANTI DENGAN API KEY ANDA
    const DEEPSEEK_API_KEY = 'sk-c7dc4b13068d4900a8ba9e87fdd0cbc3'; // ← GANTI INI!
    const API_URL = 'https://api.deepseek.com/v1/chat/completions';
    
    // Toggle chatbot
    chatbotToggle.addEventListener('click', () => {
        chatbotPanel.classList.add('active');
        chatbotToggle.style.display = 'none';
    });
    
    closeChatbot.addEventListener('click', () => {
        chatbotPanel.classList.remove('active');
        chatbotToggle.style.display = 'flex';
    });
    
    // Send message to DeepSeek API
    async function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;
        
        // Add user message to UI
        addMessageToChat(message, 'user');
        chatbotInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Get dashboard data for context
            const dashboardData = getDashboardData();
            
            // Call DeepSeek API directly from frontend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: `Anda adalah AI Assistant khusus untuk dashboard admin e-commerce.
                            
                            INFORMASI DASHBOARD SAAT INI:
                            - Total Produk: ${dashboardData.totalProducts}
                            - Pesanan Selesai: ${dashboardData.completedOrders}
                            - Pesanan Dibatalkan: ${dashboardData.cancelledOrders}
                            - Total Revenue: ${dashboardData.totalRevenue}
                            
                            PESANAN TERBARU:
                            ${dashboardData.recentPurchases}
                            
                            TUGAS ANDA:
                            1. Bantu analisis data dashboard
                            2. Berikan insight bisnis e-commerce
                            3. Sarankan perbaikan berdasarkan data
                            4. Jawab pertanyaan teknis tentang dashboard
                            5. Berikan rekomendasi strategis
                            
                            Gunakan bahasa Indonesia yang jelas dan profesional.`
                        },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                    stream: false
                })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.choices && data.choices[0]) {
                addMessageToChat(data.choices[0].message.content, 'bot');
            } else {
                addMessageToChat('Maaf, tidak mendapat respons dari AI.', 'bot');
            }
            
        } catch (error) {
            console.error('API Error:', error);
            removeTypingIndicator();
            addMessageToChat('Error menghubungi AI. Pastikan API key valid.', 'bot');
        }
    }
    
    // Get current dashboard data
    function getDashboardData() {
        // Ambil data dari halaman dashboard
        // Anda bisa modifikasi ini untuk ambil data real dari DOM
        return {
            totalProducts: document.querySelector('.card:nth-child(1) .card-value')?.textContent || '10',
            completedOrders: document.querySelector('.card:nth-child(2) .card-value')?.textContent || '0',
            cancelledOrders: document.querySelector('.card:nth-child(3) .card-value')?.textContent || '2',
            totalRevenue: document.querySelector('.card:nth-child(4) .card-value')?.textContent || 'Rp 0',
            recentPurchases: `
                1. TRX-176779784650 - Laptop ASUS ROG - Cancelled
                2. TRX-1767797088061 - Laptop ASUS ROG - Cancelled
            `
        };
    }
    
    // UI Functions
    function addMessageToChat(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = formatMessage(message);
        
        messageDiv.appendChild(messageContent);
        chatbotMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function formatMessage(text) {
        // Format markdown sederhana
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/^- (.*?)(?=<br>|$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Event Listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    
    chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Quick Questions
    const quickQuestions = [
        "Analisis data pembatalan pesanan",
        "Rekomendasi untuk meningkatkan revenue",
        "Strategi mengurangi pesanan cancelled",
        "Prediksi penjualan bulan depan",
        "Optimasi dashboard e-commerce"
    ];
    
    // Add quick questions after 3 seconds
    setTimeout(() => {
        const quickQuestionsDiv = document.createElement('div');
        quickQuestionsDiv.className = 'quick-questions';
        quickQuestionsDiv.innerHTML = `
            <p style="font-size: 12px; color: #666; margin-bottom: 8px;">Coba tanya:</p>
            ${quickQuestions.map(q => 
                `<button class="quick-question-btn" data-question="${q}">${q}</button>`
            ).join('')}
        `;
        
        chatbotMessages.appendChild(quickQuestionsDiv);
        
        // Add event listeners to quick question buttons
        document.querySelectorAll('.quick-question-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                chatbotInput.value = this.getAttribute('data-question');
                sendMessage();
            });
        });
    }, 3000);
});