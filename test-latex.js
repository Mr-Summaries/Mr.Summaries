import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://latexonline.cc/compile?text=hello');
    console.log(res.status);
  } catch (e) {
    console.error(e.message);
    if (e.response) {
      console.error(e.response.status);
      console.error(e.response.data.toString());
    }
  }
}
test();
