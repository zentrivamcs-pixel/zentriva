// /api/skills — "Learn a Skill" training applications from the registration
// page. POST is public (the application form); GET/PATCH/DELETE are admin-only
// (the Admin → Skill Requests page).
//
// One function handles all four verbs on purpose: a Vercel Hobby deployment is
// capped at 12 serverless functions, and this feature does not need four.
const { getReadyDb, parseBody, requireAdmin, sendServerError } = require('./_lib');
const skillsRepo = require('../shared/skillsRepo');
const { validateSkillApplication } = require('../shared/validation');

module.exports = async (req, res) => {
  try {
    const db = await getReadyDb();
    await skillsRepo.ensureSchema(db);

    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return res.status(200).json(await skillsRepo.listSkillApplications(db));
    }

    if (req.method === 'POST') {
      const { value, errors } = validateSkillApplication(parseBody(req));
      if (errors.length > 0) {
        return res.status(400).json({ error: `Invalid application: ${errors.join('; ')}` });
      }
      const { created, application } = await skillsRepo.createSkillApplication(db, value);
      // A duplicate within 24 hours is answered as success with the original
      // row: the applicant did what was asked, and telling them off for a
      // double-click would just make them try again.
      return res.status(created ? 201 : 200).json({ ok: true, duplicate: !created, application });
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const id = Number(req.query.id);
      const { status } = parseBody(req);
      if (!id) return res.status(400).json({ error: 'An application id is required' });
      if (!skillsRepo.APPLICATION_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${skillsRepo.APPLICATION_STATUSES.join(', ')}`,
        });
      }
      const updated = await skillsRepo.setSkillApplicationStatus(db, id, status);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: 'An application id is required' });
      const removed = await skillsRepo.deleteSkillApplication(db, id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return sendServerError(res, err, `${req.method} /api/skills`);
  }
};
