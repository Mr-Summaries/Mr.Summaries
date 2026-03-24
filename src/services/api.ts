export const api = {
  async getCourses() {
    const res = await fetch('/api/courses');
    if (!res.ok) {
      let errorMessage = `Server error: ${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Not JSON, show first 100 chars of text
          errorMessage += ` - ${text.substring(0, 100)}...`;
        }
      } catch (e) {
        // Could not even get text
      }
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  async getCourse(id: string) {
    const res = await fetch(`/api/courses/${id}`);
    if (!res.ok) {
      let errorMessage = `Server error: ${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage += ` - ${text.substring(0, 100)}...`;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  async getSummaries(courseId?: string) {
    const url = courseId ? `/api/summaries?courseId=${courseId}` : '/api/summaries';
    const res = await fetch(url);
    if (!res.ok) {
      let errorMessage = `Server error: ${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage += ` - ${text.substring(0, 100)}...`;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  async getSummary(id: string) {
    const res = await fetch(`/api/summaries/${id}`);
    if (!res.ok) {
      let errorMessage = `Server error: ${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage += ` - ${text.substring(0, 100)}...`;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  async getFileView(fileId: string) {
    return `/api/storage/files/${fileId}/view`;
  },

  async getFileDownload(fileId: string) {
    return `/api/storage/files/${fileId}/download`;
  },

  async getEnrollment(userId: string, courseId: string) {
    const res = await fetch(`/api/enrollments?userId=${userId}&courseId=${courseId}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch enrollment');
    }
    const data = await res.json();
    return data.documents[0] || null;
  },

  async getEnrollments(userId: string) {
    const res = await fetch(`/api/enrollments?userId=${userId}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch enrollments');
    }
    return await res.json();
  },

  async createEnrollment(userId: string, courseId: string) {
    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId }),
    });
    if (!res.ok) throw new Error('Failed to create enrollment');
    return await res.json();
  },

  async deleteEnrollment(id: string) {
    const res = await fetch(`/api/enrollments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete enrollment');
    return await res.json();
  },

  async getLectures(courseId: string) {
    const res = await fetch(`/api/lectures?courseId=${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch lectures');
    return await res.json();
  },

  async getExamples(courseId: string) {
    const res = await fetch(`/api/examples?courseId=${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch examples');
    return await res.json();
  },

  async getLecture(id: string) {
    const res = await fetch(`/api/lectures/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lecture');
    return await res.json();
  },

  async getExample(id: string) {
    const res = await fetch(`/api/examples/${id}`);
    if (!res.ok) throw new Error('Failed to fetch example');
    return await res.json();
  },

  async getFile(fileId: string) {
    const res = await fetch(`/api/storage/files/${fileId}`);
    if (!res.ok) throw new Error('Failed to fetch file info');
    return await res.json();
  },

  async createSummary(id: string, data: any) {
    const res = await fetch('/api/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data }),
    });
    if (!res.ok) throw new Error('Failed to create summary');
    return await res.json();
  },

  async updateSummary(id: string, data: any) {
    const res = await fetch(`/api/summaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update summary');
    return await res.json();
  },

  async deleteSummary(id: string) {
    const res = await fetch(`/api/summaries/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete summary');
    return await res.json();
  },

  async createFile(file: File, fileId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (fileId) formData.append('fileId', fileId);

    const res = await fetch('/api/storage/files', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return await res.json();
  },

  async deleteFile(fileId: string) {
    const res = await fetch(`/api/storage/files/${fileId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return await res.json();
  },

  async createCourse(id: string, data: any) {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data }),
    });
    if (!res.ok) throw new Error('Failed to create course');
    return await res.json();
  },

  async updateCourse(id: string, data: any) {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update course');
    return await res.json();
  },

  async deleteCourse(id: string) {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete course');
    return await res.json();
  },

  async createLecture(id: string, data: any) {
    const res = await fetch('/api/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data }),
    });
    if (!res.ok) throw new Error('Failed to create lecture');
    return await res.json();
  },

  async updateLecture(id: string, data: any) {
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update lecture');
    return await res.json();
  },

  async deleteLecture(id: string) {
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete lecture');
    return await res.json();
  },

  async createExample(id: string, data: any) {
    const res = await fetch('/api/examples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data }),
    });
    if (!res.ok) throw new Error('Failed to create example');
    return await res.json();
  },

  async updateExample(id: string, data: any) {
    const res = await fetch(`/api/examples/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update example');
    return await res.json();
  },

  async deleteExample(id: string) {
    const res = await fetch(`/api/examples/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete example');
    return await res.json();
  },

  async login(email: string, pass: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    return await res.json();
  },

  async signup(email: string, pass: string, name?: string) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Signup failed');
    }
    return await res.json();
  },

  async logout() {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Logout failed');
    return await res.json();
  },

  async me() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return await res.json();
  },

  async updateName(name: string) {
    const res = await fetch('/api/auth/name', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to update name');
    return await res.json();
  },

  async updateEmail(email: string, password: string) {
    const res = await fetch('/api/auth/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Failed to update email');
    return await res.json();
  }
};
