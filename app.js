const { createApp } = Vue;

const vietnameseBookNames = [
    "Sáng-thế Ký", "Xuất Ê-díp-tô Ký", "Lê-vi Ký", "Dân-số Ký", "Phục-truyền Luật-lệ Ký", "Giô-suê", "Các Quan Xét", "Ru-tơ", "1 Sa-mu-ên", "2 Sa-mu-ên", 
    "1 Các Vua", "2 Các Vua", "1 Sử-ký", "2 Sử-ký", "Ê-xơ-ra", "Nê-hê-mi", "Ê-xơ-tê", "Gióp", "Thi-thiên", "Châm-ngôn", 
    "Truyền-đạo", "Nhã-ca", "Ê-sai", "Giê-rê-mi", "Ca-thương", "Ê-xê-chi-ên", "Đa-ni-ên", "Ô-sê", "Giô-ên", "A-mốt", 
    "Áp-đia", "Giô-na", "Mi-chê", "Na-hum", "Ha-ba-cúc", "Sô-phô-ni", "A-ghê", "Xa-cha-ri", "Ma-la-chi", 
    "Ma-thi-ơ", "Mác", "Lu-ca", "Giăng", "Công-vụ các Sứ-đồ", "Rô-ma", "1 Cô-rinh-tô", "2 Cô-rinh-tô", "Ga-la-ti", "Ê-phê-sô", "Phi-líp", 
    "Cô-lô-se", "1 Tê-sa-lô-ni-ca", "2 Tê-sa-lô-ni-ca", "1 Ti-mô-thê", "2 Ti-mô-thê", "Tít", "Phi-lê-môn", "Hê-bơ-rơ", "Gia-cơ", "1 Phi-e-rơ", 
    "2 Phi-e-rơ", "1 Giăng", "2 Giăng", "3 Giăng", "Giu-đe", "Khải-huyền"
];

// Mảng mã sách chuẩn để dùng cho việc gọi file JSON Trắc nghiệm (quizzes/sa.json, quizzes/ro.json...)
const bookCodes = [
    "sa", "xu", "le", "dan", "phu", "gios", "cac", "ru", "1sa", "2sa", 
    "1vua", "2vua", "1su", "2su", "exo", "ne", "et", "giop", "thi", "ch", 
    "tr", "nha", "es", "gie", "ca", "exe", "da", "os", "gio", "am", 
    "ap", "gion", "mi", "na", "ha", "so", "ag", "xa", "ma", 
    "mat", "mac", "lu", "gi", "cong", "ro", "1co", "2co", "ga", "eph", "phi", 
    "co", "1te", "2te", "1ti", "2ti", "tit", "phil", "he", "gia", "1phi", 
    "2phi", "1gi", "2gi", "3gi", "giu", "kh"
];

createApp({
    data() {
        return {
            isLoading: true,
            loadError: false,
            bibleData: [], 
            books: [], 
            currentTab: 'read',
            selectedBookId: 0,
            selectedChapter: 1,
            startVerse: 1,
            endVerse: 1,
            passageLoaded: false,
            currentReference: '',
            displayedVerses: [], 
            standardText: '', 
            userInput: '',
            checkResult: null,
            gradingMode: 'strict',
            userHighlights: {}, 
            activeVerseKey: null,
            
            // Hệ thống Trắc nghiệm
            quizData: null,
            currentQuizBookId: null,
            currentQuiz: [],
            userAnswers: {},
            quizSubmitted: false,
            quizLoading: false,
            quizMessage: ''
        }
    },
    computed: {
        otBooks() { return this.books.filter(b => b.isOT); },
        ntBooks() { return this.books.filter(b => !b.isOT); },
        currentBookChapters() {
            const book = this.books.find(b => b.id === this.selectedBookId);
            return book ? book.chapters : 1;
        },
        currentChapterVerses() {
            try { return this.bibleData[this.selectedBookId].chapters[this.selectedChapter - 1].length; } catch(e) { return 1; }
        },
        validEndVerses() {
            const valid = [];
            for(let i = this.startVerse; i <= this.currentChapterVerses; i++) valid.push(i);
            return valid;
        }
    },
    mounted() {
        this.initApp();
    },
    methods: {
        async initApp() {
            const savedHighlights = localStorage.getItem('BIBLE_HIGHLIGHTS');
            if (savedHighlights) { this.userHighlights = JSON.parse(savedHighlights); }

            const cached = localStorage.getItem('BTT1925_DATA');
            if (cached) {
                try {
                    this.setupBible(JSON.parse(cached));
                    this.isLoading = false;
                    return;
                } catch (e) { localStorage.removeItem('BTT1925_DATA'); }
            }
            await this.fetchBibleData();
        },
        async fetchBibleData() {
            this.isLoading = true; this.loadError = false;
            try {
                const response = await fetch('https://raw.githubusercontent.com/ChiDucVo/kinh-thanh-data/main/BTT1925_HTTLVN_Chuan.json');
                if (!response.ok) throw new Error('Network error');
                const data = await response.json();
                try { localStorage.setItem('BTT1925_DATA', JSON.stringify(data)); } catch (err) {}
                this.setupBible(data);
                this.isLoading = false;
            } catch (error) { this.isLoading = false; this.loadError = true; }
        },
        setupBible(data) {
            this.bibleData = data;
            this.books = data.map((book, idx) => ({ 
                id: idx, 
                name: vietnameseBookNames[idx] || book.name, 
                code: bookCodes[idx], // Thêm mã sách để dùng cho gọi file Trắc nghiệm
                chapters: book.chapters.length, 
                isOT: idx < 39 
            }));
        },
        onBookChange() { 
            this.selectedChapter = 1; this.startVerse = 1; this.endVerse = 1; 
            this.passageLoaded = false; this.activeVerseKey = null; 
            if (this.currentTab === 'quiz') this.loadChapterQuiz(); 
        },
        onStartVerseChange() { 
            if (this.endVerse < this.startVerse) this.endVerse = this.startVerse; 
            this.passageLoaded = false; this.activeVerseKey = null; 
        },
        onVerseChange() { 
            this.passageLoaded = false; this.activeVerseKey = null;
            if (this.currentTab === 'quiz') this.loadChapterQuiz(); 
        },
        cleanVerseText(text) { return text.replace(/⚓/g, '').replace(/\s+/g, ' ').trim(); },
        
        loadPassage() {
            const book = this.books.find(b => b.id === this.selectedBookId);
            let ref = `${book.name} ${this.selectedChapter}:${this.startVerse}`;
            if (this.startVerse !== this.endVerse) ref += `-${this.endVerse}`;
            this.currentReference = ref;

            const chapterData = this.bibleData[this.selectedBookId].chapters[this.selectedChapter - 1];
            let textOnly = "";
            this.displayedVerses = []; 

            for (let i = this.startVerse - 1; i < this.endVerse; i++) {
                if (chapterData[i]) {
                    const verseText = this.cleanVerseText(chapterData[i]);
                    textOnly += verseText + " ";
                    this.displayedVerses.push({
                        num: i + 1,
                        text: verseText,
                        key: `${this.selectedBookId}_${this.selectedChapter}_${i + 1}`
                    });
                }
            }
            this.standardText = textOnly.trim();
            this.passageLoaded = true;
            
            // Xóa bảng kết quả chấm cũ, GIỮ NGUYÊN nội dung người dùng đã gõ bên Tab Học Thuộc
            this.checkResult = null; 
            
            this.activeVerseKey = null;
        },

        handleMainClick() { this.activeVerseKey = null; },
        toggleVerseSelection(key) { this.activeVerseKey = this.activeVerseKey === key ? null : key; },
        applyColor(colorClass) {
            if (!this.userHighlights[this.activeVerseKey]) {
                this.userHighlights[this.activeVerseKey] = { color: '', bold: false, italic: false };
            }
            if (this.userHighlights[this.activeVerseKey].color === colorClass) {
                this.userHighlights[this.activeVerseKey].color = '';
            } else {
                this.userHighlights[this.activeVerseKey].color = colorClass;
            }
            this.saveHighlights();
        },
        toggleStyle(styleType) {
            if (!this.userHighlights[this.activeVerseKey]) {
                this.userHighlights[this.activeVerseKey] = { color: '', bold: false, italic: false };
            }
            this.userHighlights[this.activeVerseKey][styleType] = !this.userHighlights[this.activeVerseKey][styleType];
            this.saveHighlights();
        },
        clearHighlight() {
            delete this.userHighlights[this.activeVerseKey];
            this.saveHighlights();
            this.activeVerseKey = null;
        },
        saveHighlights() { localStorage.setItem('BIBLE_HIGHLIGHTS', JSON.stringify(this.userHighlights)); },
        getHighlightClasses(key) {
            const hl = this.userHighlights[key];
            if (!hl) return '';
            let classes = hl.color ? hl.color + ' ' : '';
            if (hl.bold) classes += 'font-bold ';
            if (hl.italic) classes += 'italic ';
            return classes.trim();
        },
        hasColor(colorClass) { return this.userHighlights[this.activeVerseKey]?.color === colorClass; },
        hasStyle(styleType) { return this.userHighlights[this.activeVerseKey]?.[styleType]; },

        resetMemorize() { this.userInput = ''; this.checkResult = null; },

        // Hàm kích hoạt chấm lại ngay lập tức nếu người dùng đổi chế độ
        recheckIfChecked() {
            if (this.checkResult) {
                this.checkMemorization();
            }
        },
        
        // Hàm lọc sạch dấu câu, viết thường và loại bỏ DẤU TIẾNG VIỆT để chấm lỏng lẻo
        normalizeForLenient(text) {
            if (!text) return '';
            
            // Bước 1: Chuyển về chữ thường
            let normalized = text.toLowerCase();
            
            // Bước 2: Loại bỏ dấu tiếng Việt
            normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            normalized = normalized.replace(/đ/g, "d");

            // Bước 3: Xóa tất cả các dấu câu cơ bản và khoảng trắng dư thừa
            return normalized
                       .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""''[\]]/g, '')
                       .replace(/\s{2,}/g, ' ')
                       .trim();
        },

        checkMemorization() {
            if (!this.passageLoaded) return;
            
            let sourceText = this.standardText;
            let userText = this.userInput.replace(/\s+/g, ' ').trim();

            // Nếu người dùng chọn chấm linh hoạt, ép cả 2 đoạn văn về chữ thường và xóa hết dấu
            if (this.gradingMode === 'lenient') {
                sourceText = this.normalizeForLenient(sourceText);
                userText = this.normalizeForLenient(userText);
            }

            const DiffMatchPatch = window.diff_match_patch || diff_match_patch;
            const dmp = new DiffMatchPatch();
            const diffs = dmp.diff_main(userText, sourceText);
            dmp.diff_cleanupSemantic(diffs);

            let html = ''; let errors = 0;
            for (let i = 0; i < diffs.length; i++) {
                const [op, text] = diffs[i];
                if (op === 0) html += `<span class="diff-clean">${text}</span>`;
                else if (op === 1) { html += `<span class="diff-missing">${text}</span>`; errors += text.length; }
                else if (op === -1) { html += `<span class="diff-extra">${text}</span>`; errors += text.length; }
            }
            this.checkResult = { html, errors };
        },

        // DÁN HÀM SWITCH TAB VÀO VỊ TRÍ NÀY
        switchTab(tab) {
            this.currentTab = tab;
            if (tab === 'quiz') {
                this.fetchQuizData();
            }
        },

        // ---- HỆ THỐNG TRẮC NGHIỆM ----
        async fetchQuizData() {
            const book = this.books.find(b => b.id === this.selectedBookId);
            // Nếu đã tải file của sách này rồi thì không tải lại để tiết kiệm mạng
            if (this.currentQuizBookId === book.id && this.quizData) {
                this.loadChapterQuiz();
                return;
            }

            this.quizLoading = true;
            this.quizMessage = '';
            this.currentQuiz = [];
            this.userAnswers = {};
            this.quizSubmitted = false;

            try {
                // Gọi file JSON tương ứng với mã sách (vd: quizzes/sa.json)
                const url = `https://raw.githubusercontent.com/ChiDucVo/kinh-thanh-data/main/quizzes/${book.code}.json`;
                const res = await fetch(url, { cache: 'no-store' }); // Bỏ qua cache để luôn cập nhật câu hỏi mới
                if (!res.ok) throw new Error('Not found');
                
                this.quizData = await res.json();
                this.currentQuizBookId = book.id;
                this.loadChapterQuiz();
            } catch (e) {
                this.quizData = null;
                this.currentQuizBookId = book.id;
                this.quizMessage = 'Bộ câu hỏi cho sách này đang được biên soạn. Vui lòng quay lại sau!';
            } finally {
                this.quizLoading = false;
            }
        },
        
        loadChapterQuiz() {
            this.userAnswers = {};
            this.quizSubmitted = false;
            this.quizMessage = ''; 
            
            let chapterData = [];
            
            try {
                if (this.quizData) {
                    if (this.quizData.questions && Array.isArray(this.quizData.questions)) {
                        // Ép kiểu chuỗi để lọc chuẩn xác chương
                        let rawQuestions = this.quizData.questions.filter(q => String(q.chapter) === String(this.selectedChapter));
                        
                        chapterData = rawQuestions.map(q => {
                            let correctIdx = 0;
                            let opts = [];
                            
                            // Lọc linh hoạt nếu options là object (có key/text) hoặc chỉ là chữ bình thường
                            if (q.options && q.options.length > 0) {
                                if (typeof q.options[0] === 'object') {
                                    correctIdx = q.options.findIndex(opt => opt.key === q.correct_answer);
                                    opts = q.options.map(opt => opt.text);
                                } else {
                                    correctIdx = q.correctIndex !== undefined ? q.correctIndex : 0;
                                    opts = q.options;
                                }
                            }
                            
                            return {
                                question: q.question,
                                options: opts,
                                correctIndex: correctIdx !== -1 ? correctIdx : 0,
                                explanation: q.explanation || ""
                            };
                        });
                    } else {
                        chapterData = this.quizData[this.selectedChapter] || [];
                    }
                }
            } catch (err) {
                console.error("Lỗi xử lý JSON:", err);
                chapterData = [];
            }

            // Kiểm tra hiển thị
            if (chapterData && chapterData.length > 0) {
                this.currentQuiz = chapterData;
                this.quizMessage = '';
            } else {
                this.currentQuiz = [];
                this.quizMessage = `Chưa có câu hỏi trắc nghiệm cho chương ${this.selectedChapter}.`;
            }
        },
        
        getOptionStyle(qIndex, optIndex, correctIndex) {
            if (!this.quizSubmitted) {
                return this.userAnswers[qIndex] === optIndex 
                    ? 'border-color: #2563eb; background-color: #eff6ff;' 
                    : 'background-color: #fff;';
            }
            if (optIndex === correctIndex) {
                return 'border-color: #22c55e; background-color: #f0fdf4; font-weight: 600;'; // Xanh lá
            }
            if (this.userAnswers[qIndex] === optIndex && optIndex !== correctIndex) {
                return 'border-color: #ef4444; background-color: #fef2f2;'; // Đỏ
            }
            return 'background-color: #fff; opacity: 0.5;';
        },
        
        submitQuiz() {
            // Kiểm tra xem đã làm hết câu hỏi chưa
            const totalQuestions = this.currentQuiz.length;
            const answeredQuestions = Object.keys(this.userAnswers).length;
            if (answeredQuestions < totalQuestions) {
                alert(`Bạn còn ${totalQuestions - answeredQuestions} câu chưa chọn đáp án!`);
                return;
            }
            this.quizSubmitted = true;
        },
        
        resetQuiz() {
            this.userAnswers = {};
            this.quizSubmitted = false;
        }
    }
}).mount('#app');