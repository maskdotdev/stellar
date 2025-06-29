# 🔧 Stellar - Bug Fixes & Issues

> **For comprehensive feature development roadmap, see [STUDENT_PRO_ROADMAP.md](./STUDENT_PRO_ROADMAP.md)**

## 🐛 **Current Bugs & Issues**

### **Document Navigation**
- [x] Adding new selection from pdf viewer to an existing note doesn't work, should add the new selection at the end of the note. (FIXED: Race condition resolved with proper timing and store synchronization)
- [ ] When we have a document reference in a note, we should be able to click on it and "navigate" to the document.

### **Chat System**
- [ ] Conversation history is not being properly saved/loaded between sessions
- [ ] Document mentions in chat don't always resolve correctly
- [ ] Chat scroll position resets when minimizing/maximizing

### **Library Management**
- [ ] Category navigation breadcrumbs don't update correctly in some cases
- [ ] Document search doesn't include content from uploaded PDFs
- [ ] Category colors not consistently applied across components

### **UI/UX Issues**
- [ ] Focus mode indicator sometimes persists after exiting focus mode
- [ ] Mobile responsiveness needs improvement for floating chat
- [ ] Keyboard shortcuts conflict with browser shortcuts

### **Performance Issues**
- [ ] Large PDF files slow down document rendering
- [ ] Chat with long conversation histories becomes sluggish
- [ ] Document library loading time increases with many documents

---

## 🎯 **Priority Issues for Student Features**

### **High Priority** (Blocks student workflow)
- [ ] Conversation persistence for study session continuity
- [ ] Document-chat relationship tracking
- [ ] Search functionality across all content types

### **Medium Priority** (Improves student experience)
- [ ] Session detection and management
- [ ] Document navigation from notes
- [ ] Better mobile experience for on-the-go studying

### **Low Priority** (Polish and optimization)
- [ ] UI consistency improvements
- [ ] Performance optimizations
- [ ] Keyboard shortcut conflicts

---

## 📋 **Development Notes**
- Consider implementing action tracking system to catch and debug state management issues
- Need to improve error handling and user feedback for failed operations
- Should add comprehensive logging for debugging study workflow issues

---

**For new feature development, see**: [STUDENT_PRO_ROADMAP.md](./STUDENT_PRO_ROADMAP.md) 