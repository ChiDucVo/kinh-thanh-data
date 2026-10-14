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
            activeVerseKey: null
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
            this.books = data.map((book, idx) => ({ id: idx, name: vietnameseBookNames[idx] || book.name, chapters: book.chapters.length, isOT: idx < 39 }));
        },
        onBookChange() { this.selectedChapter = 1; this.startVerse = 1; this.endVerse = 1; this.passageLoaded = false; this.activeVerseKey = null; },
        onStartVerseChange() { if (this.endVerse < this.startVerse) this.endVerse = this.startVerse; this.passageLoaded = false; this.activeVerseKey = null; },
        onVerseChange() { this.passageLoaded = false; this.activeVerseKey = null; },
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
            this.resetMemorize();
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
        
        // Hàm lọc sạch dấu câu và viết thường để chấm lỏng lẻo
        normalizeForLenient(text) {
            if (!text) return '';
            return text.toLowerCase()
                       // Xóa tất cả các dấu câu cơ bản
                       .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""''[\]]/g, '')
                       // Xóa khoảng trắng dư thừa
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
        }
        
    }

}).mount('#app');