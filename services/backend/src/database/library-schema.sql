-- Library Management System Schema
-- Run this after your main schema

-- Books/Library Catalog table
CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    author VARCHAR(255) NOT NULL,
    co_authors TEXT,
    publisher VARCHAR(255),
    edition VARCHAR(50),
    publication_year INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    pages INTEGER,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    description TEXT,
    cover_image_url VARCHAR(500),
    location VARCHAR(100),
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    price DECIMAL(10, 2),
    condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    is_reference_only BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    keywords TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Library Members
CREATE TABLE IF NOT EXISTS library_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    member_type VARCHAR(20) CHECK (member_type IN ('student', 'teacher', 'staff')),
    membership_number VARCHAR(50) UNIQUE NOT NULL,
    membership_start_date DATE DEFAULT CURRENT_DATE,
    membership_end_date DATE,
    max_books_allowed INTEGER DEFAULT 3,
    max_days_allowed INTEGER DEFAULT 14,
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (member_type = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL) OR
        (member_type = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL)
    )
);

-- Book Borrowing/Issue Records
CREATE TABLE IF NOT EXISTS library_borrowings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    extended_times INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost', 'damaged')),
    condition_on_issue VARCHAR(20) DEFAULT 'good',
    condition_on_return VARCHAR(20),
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    fine_paid DECIMAL(10, 2) DEFAULT 0,
    fine_waived DECIMAL(10, 2) DEFAULT 0,
    remarks TEXT,
    issued_by UUID REFERENCES users(id),
    returned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book Reservations
CREATE TABLE IF NOT EXISTS library_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES library_books(id) ON DELETE CASCADE,
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE,
    reservation_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Library Fines
CREATE TABLE IF NOT EXISTS library_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrowing_id UUID REFERENCES library_borrowings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES library_members(id) ON DELETE CASCADE,
    fine_type VARCHAR(50) CHECK (fine_type IN ('overdue', 'lost', 'damaged', 'other')),
    amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    waived_amount DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    payment_date DATE,
    payment_method VARCHAR(20),
    receipt_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'waived')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_library_books_title ON library_books(title);
CREATE INDEX IF NOT EXISTS idx_library_books_author ON library_books(author);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_library_books_category ON library_books(category);
CREATE INDEX IF NOT EXISTS idx_library_members_user ON library_members(user_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_book ON library_borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_member ON library_borrowings(member_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_status ON library_borrowings(status);

-- Sample books
INSERT INTO library_books (title, author, isbn, category, sub_category, total_copies, available_copies, description)
VALUES 
    ('Things Fall Apart', 'Chinua Achebe', '978-0385474542', 'Fiction', 'African Literature', 3, 3, 'A classic novel about pre-colonial life in Nigeria'),
    ('A Brief History of Time', 'Stephen Hawking', '978-0553380163', 'Non-Fiction', 'Science', 2, 2, 'From the Big Bang to Black Holes'),
    ('The River and the Source', 'Margaret Ogola', '978-9966468376', 'Fiction', 'African Literature', 4, 4, 'An epic Kenyan novel spanning four generations')
ON CONFLICT (isbn) DO NOTHING;
