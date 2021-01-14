import * as util from 'util';
import { default as express } from 'express';
export const router = express.Router();

// ホームページ
router.get('/', async (req, res, next) => {
  console.log(req.user);
  try {
    // 全メモリストを取得して表示
    res.render('index', {title: 'Passport Test', user: req.user ? req.user : undefined});
  } catch (err) {error(err); next(err);}
});
