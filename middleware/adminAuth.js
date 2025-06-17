const adminAuth = async (req, res, next) => {
    try {
      const { accessKey } = req.body;
      
      if (!accessKey) {
        return res.status(401).json({ msg: 'Access key required' });
      }
  
      if (accessKey !== process.env.ADMIN_SECRET) {
        return res.status(410).json({ msg: 'Invalid access key' });
      }
  
      next();
    } catch (err) {
      res.status(401).json({ msg: 'Authorization failed' });
    }
  };
  
  module.exports = adminAuth;