import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, formidableMock, readFileMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  formidableMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('formidable', () => ({
  default: formidableMock,
}));

vi.mock('fs/promises', () => ({
  readFile: readFileMock,
  default: {
    readFile: readFileMock,
  },
}));

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function createSelectBuilder(result) {
  return {
    select: vi.fn(function select() {
      return this;
    }),
    eq: vi.fn(function eq() {
      return this;
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

describe('POST /api/dashboard/media', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    formidableMock.mockReset();
    readFileMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('uploads an authenticated hero image to Supabase Storage', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/event-1/hero/hero.jpg' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    });

    formidableMock.mockReturnValue({
      parse: (req, callback) => callback(null, {
        eventId: 'event-1',
        type: 'hero',
      }, {
        file: {
          filepath: 'C:/tmp/upload-file',
          mimetype: 'image/jpeg',
          originalFilename: 'Foto Principal.JPG',
        },
      }),
    });
    readFileMock.mockResolvedValue(Buffer.from('binary-data'));

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(200);
    expect(listMock).toHaveBeenCalledWith('event-1/hero', { limit: 100 });
    expect(uploadMock).toHaveBeenCalledWith(
      'event-1/hero/hero.jpg',
      Buffer.from('binary-data'),
      { contentType: 'image/jpeg', upsert: true }
    );
    expect(res.body).toEqual({
      eventId: 'event-1',
      path: 'event-1/hero/hero.jpg',
      type: 'hero',
      url: 'https://cdn.example.com/event-1/hero/hero.jpg',
    });
  });

  it('removes previous hero files before uploading new hero with different extension', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'hero.jpg' }],
      error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/event-1/hero/hero.webp' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    });

    formidableMock.mockReturnValue({
      parse: (req, callback) => callback(null, {
        eventId: 'event-1',
        type: 'hero',
      }, {
        file: {
          filepath: 'C:/tmp/upload-file',
          mimetype: 'image/webp',
          originalFilename: 'nova-foto.webp',
        },
      }),
    });
    readFileMock.mockResolvedValue(Buffer.from('binary-data'));

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(200);
    expect(removeMock).toHaveBeenCalledWith(['event-1/hero/hero.jpg']);
    expect(uploadMock).toHaveBeenCalledWith(
      'event-1/hero/hero.webp',
      expect.any(Buffer),
      { contentType: 'image/webp', upsert: true }
    );
  });

  it('uploads a pix qr image and overwrites previous file', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/event-1/pix/pix-qr.png' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    });

    formidableMock.mockReturnValue({
      parse: (req, callback) => callback(null, {
        eventId: 'event-1',
        type: 'pix-qr',
      }, {
        file: {
          filepath: 'C:/tmp/upload-file',
          mimetype: 'image/png',
          originalFilename: 'qr-pix.png',
        },
      }),
    });
    readFileMock.mockResolvedValue(Buffer.from('binary-data'));

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(200);
    expect(listMock).toHaveBeenCalledWith('event-1/pix', { limit: 100 });
    expect(uploadMock).toHaveBeenCalledWith(
      'event-1/pix/pix-qr.png',
      Buffer.from('binary-data'),
      { contentType: 'image/png', upsert: true }
    );
    expect(res.body).toEqual({
      eventId: 'event-1',
      path: 'event-1/pix/pix-qr.png',
      type: 'pix-qr',
      url: 'https://cdn.example.com/event-1/pix/pix-qr.png',
    });
  });

  it('removes previous pix file before uploading pix with different extension', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'pix-qr.jpg' }],
      error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/event-1/pix/pix-qr.png' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    });

    formidableMock.mockReturnValue({
      parse: (req, callback) => callback(null, {
        eventId: 'event-1',
        type: 'pix-qr',
      }, {
        file: {
          filepath: 'C:/tmp/upload-file',
          mimetype: 'image/png',
          originalFilename: 'qr-novo.png',
        },
      }),
    });
    readFileMock.mockResolvedValue(Buffer.from('binary-data'));

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(200);
    expect(removeMock).toHaveBeenCalledWith(['event-1/pix/pix-qr.jpg']);
    expect(uploadMock).toHaveBeenCalledWith(
      'event-1/pix/pix-qr.png',
      expect.any(Buffer),
      { contentType: 'image/png', upsert: true }
    );
  });

  it('rejects unsupported file types', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    });

    formidableMock.mockReturnValue({
      parse: (req, callback) => callback(null, {
        eventId: 'event-1',
        type: 'gallery',
      }, {
        file: {
          filepath: 'C:/tmp/upload-file',
          mimetype: 'application/pdf',
          originalFilename: 'arquivo.pdf',
        },
      }),
    });

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Unsupported file type' });
  });
});
