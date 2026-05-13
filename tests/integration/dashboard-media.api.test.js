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
      data: { publicUrl: 'https://cdn.example.com/ana-leo-2026/hero/hero.jpg' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
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
    // upload happens first, then post-upload cleanup (list + conditional remove)
    expect(uploadMock).toHaveBeenCalledWith(
      'ana-leo-2026/hero/hero.jpg',
      Buffer.from('binary-data'),
      { contentType: 'image/jpeg', upsert: true }
    );
    expect(listMock).toHaveBeenCalledWith('ana-leo-2026/hero', { limit: 100 });
    // nothing to remove when list is empty
    expect(removeMock).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      eventId: 'event-1',
      name: 'hero.jpg',
      path: 'ana-leo-2026/hero/hero.jpg',
      type: 'hero',
      url: 'https://cdn.example.com/ana-leo-2026/hero/hero.jpg',
    });
  });

  it('removes old hero file after uploading new hero with different extension', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    // after upload, folder contains both the old jpg and the new webp
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'hero.jpg' }, { name: 'hero.webp' }],
      error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/ana-leo-2026/hero/hero.webp' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
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
    expect(uploadMock).toHaveBeenCalledWith(
      'ana-leo-2026/hero/hero.webp',
      expect.any(Buffer),
      { contentType: 'image/webp', upsert: true }
    );
    // only the old jpg is removed; new webp is kept
    expect(removeMock).toHaveBeenCalledWith(['ana-leo-2026/hero/hero.jpg']);
  });

  it('upload succeeds even when post-upload cleanup list call fails', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/ana-leo-2026/hero/hero.jpg' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
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
          originalFilename: 'foto.jpg',
        },
      }),
    });
    readFileMock.mockResolvedValue(Buffer.from('binary-data'));

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    // upload must succeed regardless of cleanup failure
    expect(res.statusCode).toBe(200);
    expect(uploadMock).toHaveBeenCalled();
    expect(res.body.url).toBe('https://cdn.example.com/ana-leo-2026/hero/hero.jpg');
  });

  it('uploads a pix qr image and overwrites previous file', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/ana-leo-2026/pix/pix-qr.png' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
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
    expect(uploadMock).toHaveBeenCalledWith(
      'ana-leo-2026/pix/pix-qr.png',
      Buffer.from('binary-data'),
      { contentType: 'image/png', upsert: true }
    );
    expect(listMock).toHaveBeenCalledWith('ana-leo-2026/pix', { limit: 100 });
    expect(removeMock).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      eventId: 'event-1',
      name: 'pix-qr.png',
      path: 'ana-leo-2026/pix/pix-qr.png',
      type: 'pix-qr',
      url: 'https://cdn.example.com/ana-leo-2026/pix/pix-qr.png',
    });
  });

  it('removes old pix file after uploading pix with different extension', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    // after upload, folder contains both the old jpg and the new png
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'pix-qr.jpg' }, { name: 'pix-qr.png' }],
      error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/ana-leo-2026/pix/pix-qr.png' },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
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
    // only the old jpg is removed; new png is kept
    expect(removeMock).toHaveBeenCalledWith(['ana-leo-2026/pix/pix-qr.jpg']);
    expect(uploadMock).toHaveBeenCalledWith(
      'ana-leo-2026/pix/pix-qr.png',
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

  it('returns 413 when file exceeds max size', async () => {
    formidableMock.mockReturnValue({
      parse: (req, callback) => callback({
        code: 1009,
        httpCode: 413,
        message: 'options.maxTotalFileSize (10485760 bytes) exceeded',
      }),
    });

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' } }, res);

    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: 'Arquivo excede o limite de 10 MB.' });
  });
});

describe('Gallery operations on /api/dashboard/media', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    formidableMock.mockReset();
    readFileMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  function mockOwnedEventWithStorage(storageImpl) {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => createSelectBuilder({
        data: { id: 'event-1', user_id: 'user-1', slug: 'ana-leo-2026', config: {} },
        error: null,
      })),
      storage: {
        from: vi.fn(() => storageImpl),
      },
    });
  }

  it('lists gallery images with public URLs', async () => {
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: '001-primeira.jpg' }, { name: '002-segunda.png' }],
      error: null,
    });
    const getPublicUrlMock = vi.fn((path) => ({
      data: { publicUrl: `https://cdn.example.com/${path}` },
    }));

    mockOwnedEventWithStorage({
      list: listMock,
      getPublicUrl: getPublicUrlMock,
    });

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { eventId: 'event-1', type: 'gallery' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(listMock).toHaveBeenCalledWith('ana-leo-2026/gallery', {
      limit: 500,
      sortBy: { column: 'name', order: 'asc' },
    });
    expect(res.body.items).toEqual([
      {
        name: '001-primeira.jpg',
        path: 'ana-leo-2026/gallery/001-primeira.jpg',
        url: 'https://cdn.example.com/ana-leo-2026/gallery/001-primeira.jpg',
        alt: 'Primeira',
      },
      {
        name: '002-segunda.png',
        path: 'ana-leo-2026/gallery/002-segunda.png',
        url: 'https://cdn.example.com/ana-leo-2026/gallery/002-segunda.png',
        alt: 'Segunda',
      },
    ]);
  });

  it('reorders gallery files using storage move and returns refreshed list', async () => {
    const listMock = vi.fn()
      .mockResolvedValueOnce({
        data: [
          { name: '001-a.jpg' },
          { name: '002-b.jpg' },
          { name: '003-c.jpg' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { name: '001-b.jpg' },
          { name: '002-a.jpg' },
          { name: '003-c.jpg' },
        ],
        error: null,
      });
    const moveMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn((path) => ({
      data: { publicUrl: `https://cdn.example.com/${path}` },
    }));

    mockOwnedEventWithStorage({
      list: listMock,
      move: moveMock,
      getPublicUrl: getPublicUrlMock,
    });

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        eventId: 'event-1',
        type: 'gallery',
        order: ['002-b.jpg', '001-a.jpg', '003-c.jpg'],
      },
      query: {},
    }, res);

    expect(res.statusCode).toBe(200);
    expect(moveMock).toHaveBeenCalledTimes(4);
    expect(res.body.items.map((item) => item.name)).toEqual(['001-b.jpg', '002-a.jpg', '003-c.jpg']);
  });

  it('deletes selected gallery files by name or path', async () => {
    const listMock = vi.fn().mockResolvedValue({
      data: [
        { name: '001-a.jpg' },
        { name: '002-b.jpg' },
        { name: '003-c.jpg' },
      ],
      error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });

    mockOwnedEventWithStorage({
      list: listMock,
      remove: removeMock,
      getPublicUrl: vi.fn(),
    });

    const { default: handler } = await import('../../api/dashboard/media.js');
    const res = createMockResponse();

    await handler({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        eventId: 'event-1',
        type: 'gallery',
        names: ['001-a.jpg'],
        paths: ['ana-leo-2026/gallery/003-c.jpg'],
      },
      query: {},
    }, res);

    expect(res.statusCode).toBe(200);
    expect(removeMock).toHaveBeenCalledWith([
      'ana-leo-2026/gallery/001-a.jpg',
      'ana-leo-2026/gallery/003-c.jpg',
    ]);
    expect(res.body).toEqual({
      deleted: ['001-a.jpg', '003-c.jpg'],
      deletedCount: 2,
    });
  });
});
